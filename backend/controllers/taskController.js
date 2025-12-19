const Task = require("../models/Task");

// Get all tasks - /api/tasks - GET - Admin Only
const getTasks = async (req, res) => {
    try {
        const {status} = req.query;
        let filter = {};

        if(status){
            filter.status = status;
        }

        let tasks;

        if(req.user.role === "admin"){
            tasks = await Task.find(filter).populate("assignedTo", "name email profileImageUrl");
        }else{
            tasks = await Task.find({...filter, assignedTo: req.user._id}).populate("assignedTo", "name email profileImageUrl");
        }

        //Completed todoChecklist count to Each Task
        tasks = await Promise.all(tasks.map(async (task) => {
            const completedCount = task.todoChecklist?.filter((item) => item.completed).length;
            return {...task._doc,completedTodoCount: completedCount};
        }))

        //Status Summary counts
        const allTasks = await Task.countDocuments(req.user.role === "admin" ? {} : {assignedTo: req.user._id});
        const PendingTasks = await Task.countDocuments({...filter, status: "Pending", ...(req.user.role !== "admin" && {assignedTo: req.user._id})});
        const InProgressTasks = await Task.countDocuments({...filter, status: "In Progress", ...(req.user.role !== "admin" && {assignedTo: req.user._id})});
        const CompletedTasks = await Task.countDocuments({...filter, status: "Completed", ...(req.user.role !== "admin" && {assignedTo: req.user._id})});
        
        res.status(200).json({
            tasks,
            allTasks,
            PendingTasks,
            InProgressTasks,
            CompletedTasks,
        })
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get task by ID - /api/tasks/:id - GET - Admin Only
const getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate("assignedTo", "name email profileImageUrl");
        if(!task){
            return res.status(404).json({ message: "Task not found" });
        }
        res.status(200).json(task);
    } catch (error) { 
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Create task - /api/tasks - POST - Admin Only
const createTask = async (req, res) => {
    try {
        const{
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            attatchments,
            todoChecklist,
        } = req.body;

        if(!Array.isArray(assignedTo)){
            return res.status(400).json({ message: "Assigned to must be an array of user IDs" });
        }

        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            createdBy: req.user._id,
            todoChecklist,
            attatchments,
        });

        res.status(201).json({ message: "Task created successfully", task });
    
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update task - /api/tasks/:id - PUT - Admin Only
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if(!task){
            return res.status(404).json({ message: "Task not found" });
        }

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoChecklist = req.body.todoChecklist || task.todoChecklist;
        task.attatchments = req.body.attatchments || task.attatchments;
        task.updatedAt = Date.now();
        
        if(req.body.assignedTo){
            if(!Array.isArray(req.body.assignedTo)){
                return res.status(400).json({ message: "Assigned to must be an array of user IDs" });
            }
            task.assignedTo = req.body.assignedTo
        }
        res.status(200).json({ message: "Task updated successfully", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete task - /api/tasks/:id - DELETE - Admin Only
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
        if(!task){
            return res.status(404).json({ message: "Task not found" });
        }

        await task.deleteOne();
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update task status - /api/tasks/:id/status - PUT - Admin Only
const updateTaskStatus = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id)
        if(!task) return res.status(404).json({ message: "Task not found" });

        const isAssigned = task.assignedTo.some((userId)=> userId.toString()===req.user._id.toString())

        if(!isAssigned && req.user.role !=="admin") {
            return res.status(403).json({message: "Not Authorized"})
        }

        task.status = req.body.status || task.status

        if(task.status === "Completed"){
            if(task.todoChecklist && task.todoChecklist.length > 0){
                task.todoChecklist.forEach((item) => (item.completed = true));
            }
            task.progress = 100;
        }
        await task.save();

        res.status(200).json({ message: "Task status updated", task });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update task checklist - /api/tasks/:id/todo - PUT - Admin Only
const updateTaskChecklist = async (req, res) => {
    try {
        const { todoChecklist } = req.body;
        
        const task = await Task.findById(req.params.id)
        if(!task) return res.status(404).json({ message: "Task not found" });

        if(!task.assignedTo.includes(req.user._id) && req.user.role !== "admin"){
            return res.status(403).json({message: "Not Authorized to update checklist"})
        }

        task.todoChecklist = todoChecklist;

        //Auto Update Progress
        const completedCount = task.todoChecklist.filter((item) => item.completed).length;
        const totalItems = task.todoChecklist.length;
        task.progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;


        if(task.progress === 100){
            task.status = "Completed"
        }else if(task.progress > 0){
            task.status = "In Progress"
        }else {
            task.status = "Pending"
        }

        await task.save();
        const UpdatedTask = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        )

        res.json({message: "To Checklist Updated", task: UpdatedTask})
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get dashboard data - /api/tasks/dashboard-data - GET - Admin Only
const getDashboardData = async (req, res) => {
    try {
        const totalTasks = await Task.countDocuments();
        const PendingTasks = await Task.countDocuments({status: "Pending"});
        const InProgressTasks = await Task.countDocuments({status: "In Progress"});
        const CompletedTasks = await Task.countDocuments({status: "Completed"});
        const overdueTasks= await Task.countDocuments({
            status: {$ne:"Completed"},
            dueDate:{$lt: new Date()}
        })

        const taskStatuses = ["Pending", "In Progress", "Completed"]
        const taskDistributionRaw = await Task.aggregate([
            {
                $group:{
                    _id: "$status",
                    count:{ $sum:1 }
                },
            },
        ])

        const taskDistribution = taskStatuses.reduce(((acc,status) => {
            const formattedKey = status.replace(/\s+/g, "")
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0

            return acc;
        }), {})

        taskDistribution["All"] = totalTasks; // Add total count to taskDistribution

        // Ensure all priority levels are included
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            }
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // Fetch recent 10 tasks
        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks: totalTasks,
                pendingTasks: PendingTasks,
                inProgressTasks: InProgressTasks,
                completedTasks: CompletedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Dashboard Data User Specific - /api/tasks/user-dashboard-data - GET - User Only
const getUserDashboardData = async (req, res) => {
    try {
        const userId = req.user._id; // Only fetch data for the logged-in user

        // Fetch statistics for user-specific tasks
        const totalTasks = await Task.countDocuments({ assignedTo: userId });
        const pendingTasks = await Task.countDocuments({ assignedTo: userId, status: "Pending" });
        const inProgressTasks = await Task.countDocuments({ assignedTo: userId, status: "In Progress" });
        const completedTasks = await Task.countDocuments({ assignedTo: userId, status: "Completed" });
        const overdueTasks = await Task.countDocuments({
            assignedTo: userId,
            status: { $ne: "Completed" },
            dueDate: { $lt: new Date() },
        });

        // Task distribution by status
        const taskStatuses = ["Pending", "In Progress", "Completed"];
        const taskDistributionRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
        ]);

        const taskDistribution = taskStatuses.reduce((acc, status) => {
            const formattedKey = status.replace(/\s+/g, "");
            acc[formattedKey] = taskDistributionRaw.find((item) => item._id === status)?.count || 0;
            return acc;
        }, {});

        taskDistribution["All"] = totalTasks;

        // Task distribution by priority
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            { $match: { assignedTo: userId } },
            {
                $group: {
                    _id: "$priority",
                    count: { $sum: 1 }
                }
            },
        ]);

        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
            acc[priority] = taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
            return acc;
        }, {});

        // Fetch recent 10 tasks for the logged-in user
        const recentTasks = await Task.find({ assignedTo: userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .select("title status priority dueDate createdAt");

        res.status(200).json({
            statistics: {
                totalTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
                overdueTasks,
            },
            charts: {
                taskDistribution,
                taskPriorityLevels,
            },
            recentTasks,
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskChecklist,
    getDashboardData,
    getUserDashboardData
};