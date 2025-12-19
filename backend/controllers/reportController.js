const Task = require("../models/Task");
const User = require("../models/User");
const ExcelJS = require("exceljs");

// @desc    Export all tasks as an Excel file
// @route   GET /api/reports/export/tasks
// @access  Private (Admin)
const exportTasksReport = async (req, res) => {
    try {
        // Fetch all tasks with populated assignedTo field
        const tasks = await Task.find().populate("assignedTo", "name email");

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Tasks Report");

        // Define columns
        worksheet.columns = [
            { header: "Task ID", key: "_id", width: 25 },
            { header: "Title", key: "title", width: 30 },
            { header: "Description", key: "description", width: 40 },
            { header: "Status", key: "status", width: 15 },
            { header: "Priority", key: "priority", width: 12 },
            { header: "Due Date", key: "dueDate", width: 15 },
            { header: "Assigned To", key: "assignedTo", width: 30 },
            { header: "Progress", key: "progress", width: 10 },
            { header: "Created At", key: "createdAt", width: 20 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Add data rows
        tasks.forEach((task) => {
            worksheet.addRow({
                _id: task._id.toString(),
                title: task.title,
                description: task.description || "N/A",
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "N/A",
                assignedTo: task.assignedTo.map((user) => user.name).join(", ") || "Unassigned",
                progress: `${task.progress || 0}%`,
                createdAt: new Date(task.createdAt).toLocaleString(),
            });
        });

        // Set response headers for file download
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=tasks_report_${Date.now()}.xlsx`
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({
            message: "Error exporting tasks",
            error: error.message,
        });
    }
};

// @desc    Export user-task report as an Excel file
// @route   GET /api/reports/export/users
// @access  Private (Admin)
const exportUsersReport = async (req, res) => {
    try {
        // Fetch all users
        const users = await User.find().select("-password");

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Users Report");

        // Define columns
        worksheet.columns = [
            { header: "User ID", key: "_id", width: 25 },
            { header: "Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Role", key: "role", width: 12 },
            { header: "Total Tasks", key: "totalTasks", width: 15 },
            { header: "Pending Tasks", key: "pendingTasks", width: 15 },
            { header: "In Progress", key: "inProgressTasks", width: 15 },
            { header: "Completed Tasks", key: "completedTasks", width: 18 },
            { header: "Joined At", key: "createdAt", width: 20 },
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF70AD47" },
        };
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

        // Add data rows with task counts for each user
        for (const user of users) {
            const totalTasks = await Task.countDocuments({ assignedTo: user._id });
            const pendingTasks = await Task.countDocuments({ assignedTo: user._id, status: "Pending" });
            const inProgressTasks = await Task.countDocuments({ assignedTo: user._id, status: "In Progress" });
            const completedTasks = await Task.countDocuments({ assignedTo: user._id, status: "Completed" });

            worksheet.addRow({
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
                totalTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks,
                createdAt: new Date(user.createdAt).toLocaleString(),
            });
        }

        // Set response headers for file download
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=users_report_${Date.now()}.xlsx`
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).json({
            message: "Error exporting users report",
            error: error.message,
        });
    }
};

module.exports = {
    exportTasksReport,
    exportUsersReport,
};
