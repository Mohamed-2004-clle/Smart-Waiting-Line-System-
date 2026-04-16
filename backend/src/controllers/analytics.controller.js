import { getDashboardAnalyticsService } from "../services/analytics.service.js";

export const getDashboardAnalyticsController = async (req, res, next) => {
  try {
    const { tenantId } = req.query;

    const analytics = await getDashboardAnalyticsService(tenantId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};