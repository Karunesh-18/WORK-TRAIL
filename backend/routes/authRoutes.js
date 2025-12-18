const express = require("express")

const router = express.Router();

//Auth Routes
router.post("/register", registerUser)
router.post("/login", loginUser)
router.get("/profile", protect, getUserProfile)
router.put("/profile", protect, updateUserProfile)

module.exports = router;