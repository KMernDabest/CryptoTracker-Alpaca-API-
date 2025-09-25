import express from 'express';
import { Portfolio } from '../models/Portfolio';
import { AuthenticatedRequest } from '../middleware/auth';
import { MarketDataService } from '../services/MarketDataService';

const router = express.Router();

// Get all portfolios for user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id });
    res.json({ portfolios });
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single portfolio
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json({ portfolio });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create portfolio
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Portfolio name is required' });
    }

    const portfolio = new Portfolio({
      userId: req.user._id,
      name,
      description,
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      assets: []
    });

    await portfolio.save();
    res.status(201).json({ message: 'Portfolio created', portfolio });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update portfolio
router.put('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description } = req.body;
    
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description },
      { new: true, runValidators: true }
    );

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json({ message: 'Portfolio updated', portfolio });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete portfolio
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json({ message: 'Portfolio deleted' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add asset to portfolio
router.post('/:id/assets', async (req: AuthenticatedRequest, res) => {
  try {
    const { symbol, name, type, quantity, avgCostBasis } = req.body;

    if (!symbol || !name || !type || !quantity || !avgCostBasis) {
      return res.status(400).json({ message: 'All asset fields are required' });
    }

    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Check if asset already exists in portfolio
    const existingAssetIndex = portfolio.assets.findIndex(asset => asset.symbol === symbol);
    
    if (existingAssetIndex !== -1) {
      // Update existing asset (average cost calculation)
      const existingAsset = portfolio.assets[existingAssetIndex];
      const totalQuantity = existingAsset.quantity + quantity;
      const totalCost = (existingAsset.quantity * existingAsset.avgCostBasis) + (quantity * avgCostBasis);
      const newAvgCost = totalCost / totalQuantity;

      portfolio.assets[existingAssetIndex].quantity = totalQuantity;
      portfolio.assets[existingAssetIndex].avgCostBasis = newAvgCost;
    } else {
      // Add new asset
      portfolio.assets.push({
        symbol,
        name,
        type,
        quantity,
        avgCostBasis,
        currentPrice: avgCostBasis, // Will be updated by market data
        marketValue: quantity * avgCostBasis,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        lastUpdated: new Date()
      });
    }

    await portfolio.save();
    res.json({ message: 'Asset added to portfolio', portfolio });
  } catch (error) {
    console.error('Add asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update asset in portfolio
router.put('/:id/assets/:symbol', async (req: AuthenticatedRequest, res) => {
  try {
    const { quantity, avgCostBasis } = req.body;
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const assetIndex = portfolio.assets.findIndex(asset => asset.symbol === req.params.symbol);
    
    if (assetIndex === -1) {
      return res.status(404).json({ message: 'Asset not found in portfolio' });
    }

    if (quantity !== undefined) {
      portfolio.assets[assetIndex].quantity = quantity;
    }
    
    if (avgCostBasis !== undefined) {
      portfolio.assets[assetIndex].avgCostBasis = avgCostBasis;
    }

    // Recalculate market value
    const asset = portfolio.assets[assetIndex];
    asset.marketValue = asset.quantity * asset.currentPrice;
    asset.unrealizedPnL = asset.marketValue - (asset.quantity * asset.avgCostBasis);
    asset.unrealizedPnLPercent = (asset.unrealizedPnL / (asset.quantity * asset.avgCostBasis)) * 100;

    await portfolio.save();
    res.json({ message: 'Asset updated', portfolio });
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove asset from portfolio
router.delete('/:id/assets/:symbol', async (req: AuthenticatedRequest, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    portfolio.assets = portfolio.assets.filter(asset => asset.symbol !== req.params.symbol);
    
    await portfolio.save();
    res.json({ message: 'Asset removed from portfolio', portfolio });
  } catch (error) {
    console.error('Remove asset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get portfolio performance summary
router.get('/:id/performance', async (req: AuthenticatedRequest, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });

    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Calculate performance metrics
    const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.marketValue, 0);
    const totalCost = portfolio.assets.reduce((sum, asset) => sum + (asset.quantity * asset.avgCostBasis), 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    // Asset allocation
    const assetAllocation = portfolio.assets.map(asset => ({
      symbol: asset.symbol,
      name: asset.name,
      value: asset.marketValue,
      percentage: totalValue > 0 ? (asset.marketValue / totalValue) * 100 : 0
    }));

    // Top performers
    const topPerformers = [...portfolio.assets]
      .sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent)
      .slice(0, 5);

    const performance = {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      assetCount: portfolio.assets.length,
      assetAllocation,
      topPerformers,
      lastUpdated: new Date()
    };

    res.json({ performance });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router as portfolioRouter };