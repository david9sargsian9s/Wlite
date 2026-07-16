import { UserModel } from '../model/userModel';
import { tokenModel } from '../model/tokenModel';
import { productModel } from '../model/productModel';
import { backupModel } from '../model/backupModel';
import { VfsNodeModel } from '../model/vfsNodeModel';
import { VfsService } from './vfs.service';
import { Types } from 'mongoose';

interface IShellUser {
  id: string;
  role: 'user' | 'moderator' | 'admin';
}

export class ShService {
  public async executeCommand(
    rawCommand: string, 
    currentUser?: any, 
    currentDirId: string | null = null
  ): Promise<{ output: string; newDirId?: string | null }> {
    if (!rawCommand) return { output: '' };

    if (!currentUser) {
      return { output: '\x1b[31mcore-sh: Unauthorized access.\x1b[0m' };
    }

    const trimmed = rawCommand.trim();

    // --- Intercepting REDIRECTION (echo "hello" > file.txt) ---
    if (trimmed.startsWith('echo ') && trimmed.includes('>')) {
      const parts = trimmed.split('>');
      const echoContentRaw = parts[0].substring(5).trim();
      const targetFileName = parts[1].trim();

      // Strip quotes if present around the echo text
      const content = echoContentRaw.replace(/^["']|["']$/g, '');

      if (!targetFileName) {
        return { output: '\x1b[31mSyntax error: No output file specified after \'>\'\x1b[0m' };
      }

      try {
        const echoResult = await VfsService.writeFileContent(currentUser.id, targetFileName, currentDirId, content);
        return { output: echoResult };
      } catch (error: any) {
        return { output: `\x1b[31m[ERROR]: echo failed: ${error.message}\x1b[0m` };
      }
    }

    const args = trimmed.split(/\s+/);
    const cmd = args[0].toLowerCase();

    // --- LEVEL 1: PUBLIC COMMANDS ---
    switch (cmd) {
      case 'help':
        let helpText = 
          '\x1b[36m=================== WEB OS CORE SYSTEM MANUAL ===================\x1b[0m\n\n' +
          '\x1b[33m[ PUBLIC SUBSYSTEM COMMANDS ]\x1b[0m\n' +
          '  \x1b[32mhelp\x1b[0m               - Display this comprehensive system manual architecture.\n' +
          '  \x1b[32mwhoami\x1b[0m             - Inspect current active session identity, UID, and role.\n' +
          '  \x1b[32msysinfo\x1b[0m            - Extract server-side environment architecture, uptime & node telemetry.\n' +
          '  \x1b[32mclear\x1b[0m              - Wipe the current terminal viewport memory buffer.\n' +
          '  \x1b[32mlogout\x1b[0m             - Securely terminate session access tokens and clear cookie storage.\n' +
          '  \x1b[32mvisit <path>\x1b[0m       - Fast-travel UI engine route controller execution.\n' +
          '  \x1b[32mrmaccount\x1b[0m          - Initiate secure identity destruction guidance guidelines.\n' +
          '  \x1b[32mexit\x1b[0m               - Shutdown the terminal view session.\n\n' +
          '\x1b[33m[ VIRTUAL FILE SYSTEM COMMANDS ]\x1b[0m\n' +
          '  \x1b[32mpwd\x1b[0m                - Display absolute path of the current directory.\n' +
          '  \x1b[32mls\x1b[0m                 - List files and sub-folders in current directory.\n' +
          '  \x1b[32mcd <path>\x1b[0m          - Navigate into folder directory.\n' +
          '  \x1b[32mmkdir <name>\x1b[0m       - Create a new folder directory in local cache.\n' +
          '  \x1b[32mtouch <name>\x1b[0m       - Create an empty virtual file.\n' +
          '  \x1b[32mcat <name>\x1b[0m         - Stream file contents to standard output.\n' +
          '  \x1b[32mrm <name>\x1b[0m          - Permanently erase a file or directory.\n' +
          '  \x1b[32mecho "txt" > file\x1b[0m  - Write text string directly into selected file.\n';
        
        if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
          helpText += 
            '\n\x1b[35m[ ELEVATED PRIVILEGE COMMANDS ]\x1b[0m\n' +
            '  \x1b[32musers\x1b[0m              - Fetch and audit list of registered ecosystem accounts (Max: 10).\n';
            
          if (currentUser.role === 'admin') {
            helpText +=
              '  \x1b[32mban <email>\x1b[0m        - Force-isolate malicious actor email and invalidate active access tokens.\n\n' +
              '\x1b[31m[ ROOT ADMINISTRATION ENGINE (admin subcommands) ]\x1b[0m\n' +
              '  \x1b[34madmin\x1b[0m              - Access comprehensive root administrative pipeline controls.\n';
          }
        }
        
        helpText += '\n\x1b[36m=================================================================\x1b[0m';
        return { output: helpText };

      case 'clear':
        return { output: '__CLEAR_SCREEN__' };  

      case 'whoami':
        return { output: `User ID: ${currentUser.id}\nRole: [${currentUser.role}] (authenticated)` };

      case 'sysinfo':
        return { 
          output: `OS Node Version: ${process.version}\n` +
                  `Platform: ${process.platform}\n` +
                  `Uptime: ${Math.floor(process.uptime())}s` 
        }; 
      
      case 'logout':
        return { output: '__LOGOUT_USER__' };

      case 'rmaccount':
        return { output: 'Please visit /profile to safely delete your account.' };

      case 'visit':
        const endpoint = args[1];
        if (!endpoint) {
          return { output: '\x1b[31mUsage: visit <endpoint> (e.g., visit /profile)\x1b[0m' };
        }
        return { output: `__REDIRECT:${endpoint}__` };

      case 'exit':
        return { output: '__SHUTDOWN_OS__' };

      case 'pwd':
        try {
          const path = await VfsService.getAbsolutePath(currentUser.id, currentDirId);
          return { output: path };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: pwd failed: ${error.message}\x1b[0m` };
        }

      case 'cd':
        const targetPath = args[1];
        if (!targetPath) {
          return { output: '', newDirId: null };
        }
        try {
          const cdResult = await VfsService.cd(currentUser.id, currentDirId, targetPath);
          if (cdResult.error) {
            return { output: cdResult.error, newDirId: currentDirId };
          }
          return { output: '', newDirId: cdResult.newDirId };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: cd failed: ${error.message}\x1b[0m`, newDirId: currentDirId };
        }

      case 'mkdir':
        const dirName = args[1];
        if (!dirName) {
          return { output: '\x1b[31mUsage: mkdir <directory_name>\x1b[0m' };
        }
        try {
          const mkdirResult = await VfsService.mkdir(currentUser.id, dirName, currentDirId);
          return { output: mkdirResult };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: mkdir failed: ${error.message}\x1b[0m` };
        }

      case 'touch':
        const fileName = args[1];
        if (!fileName) {
          return { output: '\x1b[31mUsage: touch <filename>\x1b[0m' };
        }
        try {
          const touchResult = await VfsService.touch(currentUser.id, fileName, currentDirId);
          return { output: touchResult };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: touch failed: ${error.message}\x1b[0m` };
        }

      case 'cat':
        const fileToRead = args[1];
        if (!fileToRead) {
          return { output: '\x1b[31mUsage: cat <filename>\x1b[0m' };
        }
        try {
          const catResult = await VfsService.cat(currentUser.id, currentDirId, fileToRead);
          return { output: catResult };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: cat failed: ${error.message}\x1b[0m` };
        }

      case 'rm':
        const targetToRemove = args[1];
        if (!targetToRemove) {
          return { output: '\x1b[31mUsage: rm <file_or_folder_name>\x1b[0m' };
        }
        try {
          const rmResult = await VfsService.rm(currentUser.id, currentDirId, targetToRemove);
          return { output: rmResult };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: rm failed: ${error.message}\x1b[0m` };
        }

      case 'ls':
        try {
          const lsResult = await VfsService.ls(currentUser.id, currentDirId);
          return { output: lsResult };
        } catch (error: any) {
          return { output: `\x1b[31m[ERROR]: ls failed: ${error.message}\x1b[0m` };
        }
    }

    // -- VIRTUAL FILE SYSTEM CONNECTING AND MANIPULATIONS (WFS) --
    if (cmd === 'wfs') {
      const subCommand = args[1]?.toLowerCase();

      // Base WFS manual
      if (!subCommand || subCommand === 'help') {
        return {
          output: '\x1b[36m=================== WFS SUBSYSTEM MANUAL ===================\x1b[0m\n\n' +
                 '\x1b[33m[ DECENTRALIZED STORAGE ENGINE v0.2 ]\x1b[0m\n' +
                 '  \x1b[32mwfs help\x1b[0m             - Display this decentralized file system documentation.\n' +
                 '  \x1b[32mwfs connect\x1b[0m          - Initialize secure OAuth2 handshake with your Google Drive.\n' +
                 '  \x1b[32mwfs ls\x1b[0m               - Fetch and directory-audit files saved inside Web OS vault.\n' +
                 '  \x1b[32mwfs upload <file>\x1b[0m    - Pipe local asset payload directly into personal cloud storage.\n' +
                 '  \x1b[32mwfs cat <file_id>\x1b[0m    - Download cloud asset and stream content into terminal memory.\n' +
                 '  \x1b[32mwfs rm <file_id>\x1b[0m     - Purge selected unique asset completely from cloud nodes.\n' +
                 '  \x1b[32mwfs df\x1b[0m               - Track cloud storage telemetry, free space, and allocation limits.\n\n' +
                 '\x1b[90m⚠️  Notice: Scope isolated to drive.file. Web OS has zero visibility of your personal data.\x1b[0m\n' +
                 '\x1b[36m============================================================\x1b[0m'
        };
      }

      // 1. CONNECT TO GOOGLE DRIVE
      if (subCommand === 'connect') {
        const alreadyLinked = await VfsService.isConnected(currentUser.id);
        if (alreadyLinked) {
          return { output: '\x1b[32m[WFS SUCCESS]: Google Drive is already linked and active on this profile.\x1b[0m' };
        }
      
        const authUrl = VfsService.generateAuthUrl(currentUser.id);
        return { output: `__WFS_OAUTH_INIT:${authUrl}__` };
      }

      // Safeguard: Check for connection before processing active storage commands
      const linked = await VfsService.isConnected(currentUser.id);
      if (!linked) {
        return { output: '\x1b[31m[WFS ERROR]: Google Drive not linked. Please execute "wfs connect" first.\x1b[0m' };
      }

      // 2. DIRECTORY AUDIT (LIST FILES)
      if (subCommand === 'ls') {
        try {
          const filesOutput = await VfsService.ls(currentUser.id, currentDirId);
          return { output: filesOutput };
        } catch (error: any) {
          return { output: `\x1b[31m[WFS ERROR]: Failed to fetch file structure: ${error.message}\x1b[0m` };
        }
      }

      // 3. FILE CAT (VIEW CONTENT)
      if (subCommand === 'cat') {
        const fileId = args[2];
        if (!fileId) {
          return { output: '\x1b[31mUsage: wfs cat <file_name>\x1b[0m' };
        }
        try {
          const catResult = await VfsService.cat(currentUser.id, currentDirId, fileId);
          return { output: catResult };
        } catch (error: any) {
          return { output: `\x1b[31m[WFS ERROR]: Failed to read file [${fileId}]: ${error.message}\x1b[0m` };
        }
      }

      // 4. PURGE ASSET (REMOVE FILE)
      if (subCommand === 'rm') {
        const fileId = args[2];
        if (!fileId) {
          return { output: '\x1b[31mUsage: wfs rm <file_name_or_folder>\x1b[0m' };
        }
        try {
          const rmResult = await VfsService.rm(currentUser.id, currentDirId, fileId);
          return { output: rmResult };
        } catch (error: any) {
          return { output: `\x1b[31m[WFS ERROR]: Failed to delete asset: ${error.message}\x1b[0m` };
        }
      }

      // 5. STORAGE TELEMETRY (DISK USAGE)
      if (subCommand === 'df') {
        try {
          const userObjectId = new Types.ObjectId(currentUser.id);
          const nodes = await VfsNodeModel.find({ userId: userObjectId });
          
          let estimatedBytes = 0;
          nodes.forEach(node => {
            estimatedBytes += Buffer.byteLength(node.name || '') + Buffer.byteLength(node.content || '');
          });

          const usedMB = (estimatedBytes / (1024 * 1024)).toFixed(4);
          const limitMB = "15.00";
          
          return { 
            output: `\x1b[36m[WFS CLOUD METRICS]\x1b[0m\n` +
                    `  Estimated DB Usage:  ${usedMB} MB\n` +
                    `  Virtual Limit:       ${limitMB} GB\n` +
                    `  Connection Status:   Stable (G-Drive OAuth2 Active)`
          };
        } catch (error: any) {
          return { output: `\x1b[31m[WFS ERROR]: Could not fetch telemetry: ${error.message}\x1b[0m` };
        }
      }

      // 6. UPLOAD ASSET (TRIGGERS FRONTEND UPLOAD DIALOG)
      if (subCommand === 'upload') {
        return { output: `__WFS_UPLOAD_INIT:${currentDirId || 'root'}__` };
      }
    
      return { output: `\x1b[31mcore-sh: Unknown wfs subcommand: ${subCommand}\x1b[0m` };
    }

    // --- LEVEL 2: MODERATOR AND ADMINISTRATOR TEAMS ---
    if (cmd === 'users') {
      if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        return { output: '\x1b[31mcore-sh: Permission denied. You need to be a Moderator or Admin.\x1b[0m' };
      }

      const users = await UserModel.find().limit(10).select('name email role status');
      let result = 'Registered OS Users:\n';
      users.forEach((u) => {
        const color = u.status === 'banned' ? '\x1b[31m' : '\x1b[32m';
        result += `- ${u.name} [${u.email}] | Role: ${u.role} | Status: ${color}${u.status}\x1b[0m\n`;
      });
      return { output: result.trim() };
    }

    if (cmd === 'ban') {
      if (currentUser.role !== 'admin') {
        return { output: '\x1b[31mcore-sh: Permission denied. This is a critical command. Critical actions are restricted for your role.\x1b[0m' };
      }

      const targetEmail = args[1];
      if (!targetEmail) {
        return { output: '\x1b[31mUsage: ban <email>\x1b[0m' };
      }

      const targetUser = await UserModel.findOne({ email: targetEmail.toLowerCase() });
      if (!targetUser) return { output: '\x1b[31mError: User not found.\x1b[0m' };
      if (targetUser._id.toString() === currentUser.id) {
        return { output: '\x1b[31mError: You cannot ban yourself.\x1b[0m' };
      }

      targetUser.status = 'banned';
      await targetUser.save();

      await tokenModel.deleteMany({ userID: targetUser._id as any });

      return { output: `\x1b[32mSuccess: User [${targetEmail}] has been banned. Active sessions terminated.\x1b[0m` };
    }

    // --- LEVEL 3: ADMIN TOOL SUITE ---
    if (cmd === 'admin') {
      if (currentUser.role !== 'admin') {
        return { output: '\x1b[31mcore-sh: Access denied. Root administration privileges required.\x1b[0m' };
      }

      const subCommand = args[1]?.toLowerCase();

      if (!subCommand || subCommand === 'help') {
        return {
          output: 'Web OS Core Admin Engine:\n' +
                 '  admin user delete <email>     - Force completely erase a user account\n' +
                 '  admin user role <email> <role>- Modify account access levels (user/moderator/admin)\n' +
                 '  admin product list            - Show catalog files data items mapped in DB\n' +
                 '  admin product add <name> <pr> - Register new deployment resource into storage\n' +
                 '  admin product rm <id>         - Purge commercial item from data collection\n' +
                 '  admin system backup [memo]    - Save instant snapshot architecture into logs\n' +
                 '  admin system rollback <id>    - Wipe and overwrite cluster state to snapshot'
        };
      }

      // Context branch: Admin operations over user entities
      if (subCommand === 'user') {
        const action = args[2]?.toLowerCase();
        const email = args[3]?.toLowerCase();

        if (!email) return { output: '\x1b[31mError: Targeted user email configuration parameter missing.\x1b[0m' };

        const targetUser = await UserModel.findOne({ email });
        if (!targetUser) return { output: '\x1b[31mError: Target identity profile records not found.\x1b[0m' };

        if (action === 'delete') {
          if (targetUser._id.toString() === currentUser.id) {
            return { output: '\x1b[31mError: Administrative override failed. Cannot execute self-destruction.\x1b[0m' };
          }
          await tokenModel.deleteMany({ userID: targetUser._id as any });
          await UserModel.findByIdAndDelete(targetUser._id);
          return { output: `\x1b[32mRoot Action Complete: User account [${email}] permanently wiped from DB.\x1b[0m` };
        }

        if (action === 'role') {
          const targetRole = args[4]?.toLowerCase() as 'user' | 'moderator' | 'admin';
          if (targetRole !== 'user' && targetRole !== 'moderator' && targetRole !== 'admin') {
            return { output: '\x1b[31mError: Invalid context role target. Choose user, moderator, or admin.\x1b[0m' };
          }
          targetUser.role = targetRole;
          await targetUser.save();
          return { output: `\x1b[32mRoot Action Complete: User [${email}] role altered to [${targetRole}].\x1b[0m` };
        }
      }

      // Context branch: Admin operations over catalog storage assets
      if (subCommand === 'product') {
        const action = args[2]?.toLowerCase();

        // Sub-route: admin product list (REAL DATABASE VIEW)
        if (action === 'list') {
          const products = await productModel.find().limit(15);
          if (products.length === 0) return { output: 'Warehouse storage is completely empty.' };
          
          let listResult = 'Current Active Product Catalog:\n';
          products.forEach((p: any) => {
            listResult += `  ID: \x1b[33m${p._id}\x1b[0m | Name: ${p.name} | Price: \x1b[32m$${p.price || 0}\x1b[0m | Stock: ${p.stock ?? 0}\n`;
          });
          return { output: listResult.trim() };
        }

        // Sub-route: admin product add
        if (action === 'add') {
          const productName = args[3];
          const productPriceRaw = args[4];
          
          if (!productName || !productPriceRaw) {
            return { output: '\x1b[31mUsage: admin product add <name> <price_number>\x1b[0m' };
          }

          const parsedPrice = parseFloat(productPriceRaw);
          if (isNaN(parsedPrice)) {
            return { output: '\x1b[31mError: Price parameter must be a valid number.\x1b[0m' };
          }
          
          await productModel.create({ 
            name: productName, 
            price: parsedPrice,
            description: 'Automated deployment via Web OS CLI engine.', 
            image: 'default-asset.png',                                
            stock: 5                                                   
          });
          
          return { output: `\x1b[32mCatalog Updated: Product asset "${productName}" successfully saved to MongoDB.\x1b[0m` };
        }

        // Sub-route: admin product rm
        if (action === 'rm') {
          const productId = args[3];
          if (!productId) return { output: '\x1b[31mUsage: admin product rm <product_database_id>\x1b[0m' };
          
          const target = await productModel.findById(productId);
          if (!target) return { output: '\x1b[31mError: Product asset not found in database records.\x1b[0m' };

          await productModel.findByIdAndDelete(productId);
          return { output: `\x1b[32mCatalog Updated: Product asset "${productId}" evicted from system files.\x1b[0m` };
        }
      }

      // Context branch: Core Infrastructure & State Restorations
      if (subCommand === 'system') {
        const action = args[2]?.toLowerCase();

        // 1. CREATE BACKUP SNAPSHOT
        if (action === 'backup') {
          const memo = args.slice(3).join(' ') || 'Manual summer snapshot state.';
          
          const currentUsers = await UserModel.find({});
          const currentProducts = await productModel.find({});

          const generatedId = `snap_${Date.now()}`;

          await backupModel.create({
            snapshotId: generatedId,
            description: memo,
            usersData: currentUsers,
            productsData: currentProducts
          });

          return {
            output: `\x1b[32m[SYSTEM SUCCESS]: Snapshot [${generatedId}] committed to safe storage.\x1b[0m\n` +
                   `  - Users backed up: ${currentUsers.length}\n` +
                   `  - Products backed up: ${currentProducts.length}`
          };
        }

        // 2. ROLLBACK TO SNAPSHOT (DANGER ZONE)
        if (action === 'rollback') {
          const targetSnapId = args[3];
          if (!targetSnapId) return { output: '\x1b[31mUsage: admin system rollback <snapshot_id>\x1b[0m' };

          const snapshot = await backupModel.findOne({ snapshotId: targetSnapId });
          if (!snapshot) return { output: `\x1b[31mError: Snapshot [${targetSnapId}] not found in records.\x1b[0m` };

          // CRITICAL OVERWRITE PROCESS
          await UserModel.deleteMany({});
          await productModel.deleteMany({});

          if (snapshot.usersData.length > 0) {
            await UserModel.insertMany(snapshot.usersData);
          }
          if (snapshot.productsData.length > 0) {
            await productModel.insertMany(snapshot.productsData);
          }

          return {
            output: `\x1b[35m[SYSTEM RESTORED]: Infrastructure rolled back to state [${targetSnapId}] successfully.\x1b[0m\n` +
                   `Database synchronized to date: ${snapshot.createdAt.toISOString()}`
          };
        }
        
        return { output: '\x1b[31mUsage: admin system <backup [memo] | rollback [id]>\x1b[0m' };
      }

      return { output: '\x1b[31mcore-sh: Unknown core administration subcommand pipeline.\x1b[0m' };
    }

    return { output: `\x1b[31mcore-sh: command not found: ${cmd}\x1b[0m` };
  }
}

export const shService = new ShService();