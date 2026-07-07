import { Schema, model, Document } from 'mongoose';

export interface IBackup extends Document {
  snapshotId: string;
  description: string;
  usersData: any[];     // Fallback to any[] here perfectly matches Mongoose array definitions
  productsData: any[]; 
  createdAt: Date;
}

const BackupSchema = new Schema<IBackup>(
  {
    snapshotId: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true 
    },
    description: { 
      type: String, 
      default: 'Automated Core Backup' 
    },
    // Direct array assignment avoids strict type definition mismatches in Mongoose
    usersData: [Schema.Types.Mixed],
    productsData: [Schema.Types.Mixed]
  },
  { 
    timestamps: { createdAt: true, updatedAt: false }, 
    versionKey: false 
  }
);

export const backupModel = model<IBackup>('backups', BackupSchema);