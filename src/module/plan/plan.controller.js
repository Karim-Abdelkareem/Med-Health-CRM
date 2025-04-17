import Plan from "./plan.model.js";
import { rolesHierarchy, canAccessHigherRole } from "../../utils/roles.js";
import User from "../userModule/userModel.js";
import { updateKPI } from "../userModule/userController.js"


export const createPlan = async (req, res) => {
    try {
        const { type, date, region, notes } = req.body;

        let warningMessage = null;
        if (type === "daily" && region.length < 10) {
            warningMessage = "KPI الخاص بك سيتأثر هذا الشهر بسبب عدم إضافة 10 زيارات.";
        }

        const newPlan = await Plan.create({
            user: req.user._id,
            type,
            date,
            region,
            notes,
        });

        const newKPI = await updateKPI(req.user._id, region.length);

      
        res.status(201).json({
            success: true,
            message: "تم إنشاء الخطة بنجاح",
            data: newPlan,
            kpi: newKPI,
            warning: warningMessage, 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "خطأ في إنشاء الخطة", error: err.message });
    }
};




export const getMyPlans = async (req, res) => {
    try {
        const plans = await Plan.find({ user: req.user._id }).sort({ date: 1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: "Error fetching plans", error: err.message });
    }
};

export const updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findById(id);

        if (!plan) return res.status(404).json({ message: "Plan not found" });

        if (plan.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const updatedPlan = await Plan.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedPlan);
    } catch (err) {
        res.status(500).json({ message: "Error updating plan", error: err.message });
    }
};

export const deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await Plan.findById(id);

        if (!plan) return res.status(404).json({ message: "Plan not found" });

        if (plan.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await plan.deleteOne();
        res.json({ message: "Plan deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting plan", error: err.message });
    }
};

export const getMyPlansByFilter = async (req, res) => {
    try {
        const { keyword, type, date, startDate, endDate } = req.query;

        let filter = { user: req.user._id };

        if (type) {
            if (["daily", "weekly", "monthly"].includes(type)) {
                filter.type = type;
            } else {
                return res.json([]);
            }
        }


        if (keyword && keyword.trim() !== "") {
            filter.$or = [
                { region: { $regex: keyword, $options: "i" } },
                { notes: { $regex: keyword, $options: "i" } },
            ];
        }

        if (date) {
            const exactDate = new Date(date);
            if (!isNaN(exactDate)) {
                const nextDay = new Date(exactDate);
                nextDay.setDate(exactDate.getDate() + 1);

                filter.date = {
                    $gte: exactDate,
                    $lt: nextDay,
                };
            }
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (!isNaN(start) && !isNaN(end)) {
                filter.date = {
                    $gte: start,
                    $lte: end,
                };
            }
        }

        const plans = await Plan.find(filter).sort({ date: 1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: "Error fetching plans", error: err.message });
    }
};

export const addManagerNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const plan = await Plan.findById(id).populate("user");

        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }

        const currentUserRole = req.user.role;
        const targetUserRole = plan.user.role;

        if (canAccessHigherRole(currentUserRole, targetUserRole)) {
            plan.managerNotes = note;
            await plan.save();
            return res.json({ message: "Note added successfully", plan });
        } else {
            return res.status(403).json({ message: "Not authorized to add notes to this user's plan" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error adding note", error: err.message });
    }
};

export const getPlansByHierarchy = async (req, res) => {
    try {
        const currentUserRole = req.user.role;

        const users = await User.find({
            role: { $in: Object.keys(rolesHierarchy).filter(role => canAccessHigherRole(currentUserRole, role)) }
        });

        const userIds = users.map(u => u._id);

        const plans = await Plan.find({ user: { $in: userIds } }).populate("user").sort({ date: 1 });

        res.json(plans);
    } catch (err) {
        res.status(500).json({ message: "Error fetching plans", error: err.message });
    }
};





