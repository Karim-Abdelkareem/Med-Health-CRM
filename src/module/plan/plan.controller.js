import Plan from "./plan.model.js";

export const createPlan = async (req, res) => {
    try {
        const { type, date, region, notes } = req.body;

        const newPlan = await Plan.create({
            user: req.user._id,
            type,
            date,
            region,
            notes,
        });

        res.status(201).json(newPlan);
    } catch (err) {
        res.status(500).json({ message: "Error creating plan", error: err.message });
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



