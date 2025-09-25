import express from 'express';
import { PriceAlert } from '../models/PriceAlert';
import { AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get all alerts for user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { isActive } = req.query;
    const filter: any = { userId: req.user._id };
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const alerts = await PriceAlert.find(filter).sort({ createdAt: -1 });
    res.json({ alerts });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single alert
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const alert = await PriceAlert.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({ alert });
  } catch (error) {
    console.error('Get alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create alert
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      symbol, 
      name, 
      type, 
      alertType, 
      targetPrice, 
      changePercent,
      currentPrice,
      notificationMethod,
      message 
    } = req.body;

    // Validation
    if (!symbol || !name || !type || !alertType || !currentPrice) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    if ((alertType === 'above' || alertType === 'below') && !targetPrice) {
      return res.status(400).json({ message: 'Target price is required for price alerts' });
    }

    if (alertType === 'change_percent' && !changePercent) {
      return res.status(400).json({ message: 'Change percent is required for percentage alerts' });
    }

    const alert = new PriceAlert({
      userId: req.user._id,
      symbol: symbol.toUpperCase(),
      name,
      type,
      alertType,
      targetPrice,
      changePercent,
      currentPrice,
      notificationMethod: notificationMethod || 'browser',
      message,
      isActive: true,
      isTriggered: false
    });

    await alert.save();
    res.status(201).json({ message: 'Alert created', alert });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update alert
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const updateFields = req.body;
    
    // Don't allow updating userId or symbol
    delete updateFields.userId;
    delete updateFields.symbol;
    
    const alert = await PriceAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({ message: 'Alert updated', alert });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete alert
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const alert = await PriceAlert.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle alert active status
router.patch('/:id/toggle', async (req: AuthenticatedRequest, res) => {
  try {
    const alert = await PriceAlert.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.isActive = !alert.isActive;
    
    // Reset triggered status when reactivating
    if (alert.isActive) {
      alert.isTriggered = false;
      alert.triggeredAt = undefined;
    }

    await alert.save();
    res.json({ message: 'Alert status updated', alert });
  } catch (error) {
    console.error('Toggle alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark alert as triggered
router.patch('/:id/trigger', async (req: AuthenticatedRequest, res) => {
  try {
    const alert = await PriceAlert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        isTriggered: true, 
        triggeredAt: new Date(),
        isActive: false // Deactivate after triggering
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json({ message: 'Alert triggered', alert });
  } catch (error) {
    console.error('Trigger alert error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get alert statistics
router.get('/stats/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const totalAlerts = await PriceAlert.countDocuments({ userId: req.user._id });
    const activeAlerts = await PriceAlert.countDocuments({ 
      userId: req.user._id, 
      isActive: true 
    });
    const triggeredAlerts = await PriceAlert.countDocuments({ 
      userId: req.user._id, 
      isTriggered: true 
    });

    // Get alerts by type
    const alertsByType = await PriceAlert.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$alertType', count: { $sum: 1 } } }
    ]);

    // Recent triggered alerts
    const recentTriggered = await PriceAlert.find({ 
      userId: req.user._id, 
      isTriggered: true 
    })
    .sort({ triggeredAt: -1 })
    .limit(5)
    .select('symbol name alertType targetPrice triggeredAt');

    const stats = {
      totalAlerts,
      activeAlerts,
      triggeredAlerts,
      alertsByType,
      recentTriggered
    };

    res.json({ stats });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router as alertsRouter };