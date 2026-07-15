import { google } from 'googleapis';
import { UserModel } from '../model/userModel';
import { IVfsNodeDocument, VfsNodeModel } from '../model/vfsNodeModel';
import { Types } from 'mongoose';

export class VfsService {
  private static getOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Generate a link for a specific session user
  public static generateAuthUrl(userId: string): string {
    const oauth2Client = this.getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId // Pass the session user ID to state
    });
  }

  // Quick check: is the drive already mapped?
  public static async isConnected(userId: string): Promise<boolean> {
    const user = await UserModel.findById(userId);
    return !!user?.googleDrive?.isConnected;
  }

  /**
  * 1. Creating a directory (mkdir)
  */

  public static async mkdir(userId: string, dirName: string, parentId: string | null): Promise<string> {
    try {
      // Folder name validation (no spaces, special characters, etc.)
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(dirName)) {
        return '\x1b[31m[WFS ERROR]: Invalid directory name. Use only alphanumeric characters, dots, hyphens or underscores.\x1b[0m';
      }
      
      const parentObjectId = parentId ? new Types.ObjectId(parentId) : null;
      const userObjectId = new Types.ObjectId(userId);
      
      // We check if there is already a folder/file with this name in the current directory
      const exists = await VfsNodeModel.findOne({
        userId : userObjectId,
        parentId : parentObjectId,
        name: dirName
      });

      if (exists) {
        return `\x1b[31m[WFS ERROR]: mkdir: cannot create directory '${dirName}': File or directory exists.\x1b[0m`;
      }

      // Create a new node folder in MongoDB
      const newDir = await VfsNodeModel.create({
        userId : userObjectId,
        name: dirName,
        type: 'dir',
        parentId : parentObjectId,
        content: '',
        isSynced: false
      });

      return `\x1b[32mCreated directory: ${dirName}\x1b[0m`;
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: Failed to create directory. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 2. Determining the current path for the pwd command
  * The method recursively ascends by parentId and builds a nice path string
   */
  public static async getAbsolutePath(userId: string, currentDirId: string | null): Promise<string> {
    if (!currentDirId) {
      return '/';
    }

    try {
      const pathParts: string[] = [];
      let currentId: string | null = currentDirId;
      const userObjectId = new Types.ObjectId(userId);

      while (currentId) {
        const targetObjectId: Types.ObjectId = new Types.ObjectId(currentId);
        
        const node: IVfsNodeDocument | null = await VfsNodeModel.findOne({ 
          _id: targetObjectId, 
          userId: userObjectId 
        });
        
        if (!node) break;

        pathParts.unshift(node.name);
        currentId = node.parentId ? node.parentId.toString() : null;
      }

      return '/' + pathParts.join('/');
    } catch {
      return '\x1b[31m[WFS ERROR]: Failed to resolve path.\x1b[0m';
    }
  }

  /**
   * 3. Listing directory contents (ls)
   */
  public static async ls(userId: string, currentDirId: string | null): Promise<string> {
    try {
      const userObjectId = new Types.ObjectId(userId);
      const parentObjectId = currentDirId ? new Types.ObjectId(currentDirId) : null;

      // Search for all files and folders within the current parent
      const nodes = await VfsNodeModel.find({
        userId: userObjectId,
        parentId: parentObjectId
      }).sort({ type: 1, name: 1 }); // first folders (dir), then files (file) in alphabetical order

      if (nodes.length === 0) {
        return '\x1b[90m(directory is empty)\x1b[0m';
      }

      let output = '';
      nodes.forEach((node) => {
        if (node.type === 'dir') {
          // We display folders in blue with a closing slash
          output += `📁 \x1b[34m${node.name}/\x1b[0m   `;
        } else {
          // Display files in green
          output += `📄 \x1b[32m${node.name}\x1b[0m   `;
        }
      });

      return output.trim();
    } catch (error: any) {
      return `\x1b[31m[WFS ERROR]: ls failed. (${error.message})\x1b[0m`;
    }
  }

  /**
   * 4. Change directory (cd)
   * Returns an object with the new directory ID and an error text if the transition is not possible.
   */
  public static async cd(
    userId: string, 
    currentDirId: string | null, 
    targetPath: string
  ): Promise<{ newDirId: string | null; error?: string }> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      // Handling the transition to the root "cd /"
      if (targetPath === '/' || targetPath === '~') {
        return { newDirId: null };
      }

      // Handling the move up one level "cd .."
      if (targetPath === '..') {
        if (!currentDirId) {
          // We're already at the root, there's nowhere higher to go.
          return { newDirId: null };
        }
        const currentFolder = await VfsNodeModel.findOne({ _id: new Types.ObjectId(currentDirId), userId: userObjectId });
        if (!currentFolder) {
          return { newDirId: null, error: '\x1b[31mcd: current directory is lost.\x1b[0m' };
        }
        return { newDirId: currentFolder.parentId ? currentFolder.parentId.toString() : null };
      }

      // A simple way to navigate to a folder by name (so far without complex paths like 'folder/subfolder')
      const targetFolder = await VfsNodeModel.findOne({
        userId: userObjectId,
        parentId: currentDirId ? new Types.ObjectId(currentDirId) : null,
        name: targetPath,
        type: 'dir' // You can only navigate to directories
      });

      if (!targetFolder) {
        // Let's check, maybe this is a file at all?
        const isFile = await VfsNodeModel.findOne({
          userId: userObjectId,
          parentId: currentDirId ? new Types.ObjectId(currentDirId) : null,
          name: targetPath,
          type: 'file'
        });

        if (isFile) {
          return { newDirId: currentDirId, error: `\x1b[31mcd: not a directory: ${targetPath}\x1b[0m` };
        }

        return { newDirId: currentDirId, error: `\x1b[31mcd: no such file or directory: ${targetPath}\x1b[0m` };
      }

      return { newDirId: targetFolder._id.toString() };
    } catch (error: any) {
      return { newDirId: currentDirId, error: `\x1b[31m[WFS ERROR]: cd failed. (${error.message})\x1b[0m` };
    }
  }
}