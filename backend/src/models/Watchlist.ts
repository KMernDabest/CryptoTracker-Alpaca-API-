import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchlist extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  symbols: IWatchlistItem[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWatchlistItem {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  addedAt: Date;
}

const watchlistItemSchema = new Schema<IWatchlistItem>({
  symbol: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['stock', 'crypto'], required: true },
  addedAt: { type: Date, default: Date.now }
});

const watchlistSchema = new Schema<IWatchlist>({
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
  symbols: [watchlistItemSchema],
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
watchlistSchema.index({ userId: 1 });
watchlistSchema.index({ 'symbols.symbol': 1 });

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', watchlistSchema);