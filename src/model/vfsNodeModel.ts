import { Schema, model, Document, Types } from "mongoose";

export interface IVfsNode {
    userId : Types.ObjectId | string;             // file/folder owner
    name : string;                              // name (for example "documents" or "script.js")
    type : 'file' | 'dir';                      // node type
    parentId : Types.ObjectId | string | null;    // null means, then node is at the root "/"
    content : string;                           // text content (only from files)

    // CRITICAL FIELDS FOR CONNECTION WITH GOOGLE DRIVE
    googleFileId : string | null;               // ID from node(file/dir) on google drive (if synced)
    isSynced : boolean;                         // flag for syncing with cloud storage

    createdAt : Date;
    updatedAt : Date;
}

export interface IVfsNodeDocument extends IVfsNode, Document {}

const VfsNodeSchema = new Schema<IVfsNodeDocument>({
    userId : { type : Schema.Types.ObjectId, ref: 'users', required : true },
    name : { type : String, required : true },
    type : { type : String, enum : ['file', 'dir'], required : true },
    parentId : { type : Schema.Types.ObjectId, ref : 'VfsNode', default : null },
    content : { type : String, default : '' },

    googleFileId : { type : String, default : null },
    isSynced : { type : Boolean, default : false }
}, { timestamps : true });

// We create a composite index so that one user does not have files with the same name in one folder.
VfsNodeSchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

export const VfsNodeModel = model<IVfsNodeDocument>('VfsNode', VfsNodeSchema);