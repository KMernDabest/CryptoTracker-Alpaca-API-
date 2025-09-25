import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceAlert extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  alertType: 'above' | 'below' | 'change_percent';
  targetPrice?: number;
  changePercent?: number;
  currentPrice: number;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
  notificationMethod: 'browser' | 'email' | 'both';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const priceAlertSchema = new Schema<IPriceAlert>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['stock', 'crypto'],
    required: true
  },
  alertType: {
    type: String,
    enum: ['above', 'below', 'change_percent'],
    required: true
  },
  targetPrice: {
    type: Number,
    min: 0,
    required: function(this: IPriceAlert) {
      return this.alertType === 'above' || this.alertType === 'below';
    }
  },
  changePercent: {
    type: Number,
    required: function(this: IPriceAlert) {
      return this.alertType === 'change_percent';
    }
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isTriggered: {
    type: Boolean,
    default: false
  },
  triggeredAt: {
    type: Date
  },
  notificationMethod: {
    type: String,
    enum: ['browser', 'email', 'both'],
    default: 'browser'
  },
  message: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
priceAlertSchema.index({ userId: 1, isActive: 1 });
priceAlertSchema.index({ symbol: 1, isActive: 1 });
priceAlertSchema.index({ isTriggered: 1 });

export const PriceAlert = mongoose.model<IPriceAlert>('PriceAlert', priceAlertSchema);