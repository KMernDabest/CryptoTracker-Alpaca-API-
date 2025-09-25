import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolio extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  assets: IPortfolioAsset[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPortfolioAsset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  lastUpdated: Date;
}

const portfolioAssetSchema = new Schema<IPortfolioAsset>({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  quantity: { type: Number, required: true, min: 0 },
  avgCostBasis: { type: Number, required: true, min: 0 },
  currentPrice: { type: Number, required: true, min: 0 },
  marketValue: { type: Number, required: true, min: 0 },
  unrealizedPnL: { type: Number, required: true },
  unrealizedPnLPercent: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const portfolioSchema = new Schema<IPortfolio>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  totalValue: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  totalPnL: {
    type: Number,
    required: true,
    default: 0
  },
  totalPnLPercent: {
    type: Number,
    required: true,
    default: 0
  },
  assets: [portfolioAssetSchema]
}, {
  timestamps: true
});

// Index for efficient queries
portfolioSchema.index({ userId: 1 });
portfolioSchema.index({ 'assets.symbol': 1 });

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', portfolioSchema);