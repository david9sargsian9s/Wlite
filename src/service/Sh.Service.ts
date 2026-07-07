import { UserModel } from '../model/userModel';
import { tokenModel } from '../model/tokenModel';

// Product model placeholder (Import your actual product model here if you have one)
// import { ProductModel } from '../model/productModel'; 

interface IShellUser {
  id: string;
  role: 'user' | 'moderator' | 'admin';
}

export class ShService {
  public async executeCommand(rawCommand: string, currentUser?: IShellUser): Promise<string> {
    if (!rawCommand) return '';

    if (!currentUser) {
      return '\x1b[31mcore-sh: Unauthorized access.\x1b[0m';
    }

    const args = rawCommand.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    // --- LEVEL 1: PUBLIC COMMANDS ---
    switch (cmd) {
      case 'help':
        // Base system documentation available to all authenticated operators
        let helpText = 
          '\x1b[36m=================== WEB OS CORE SYSTEM MANUAL ===================\x1b[0m\n\n' +
          '\x1b[33m[ PUBLIC SUBSYSTEM COMMANDS ]\x1b[0m\n' +
          '  \x1b[32mhelp\x1b[0m               - Display this comprehensive system manual architecture.\n' +
          '  \x1b[32mwhoami\x1b[0m             - Inspect current active session identity, UID, and role.\n' +
          '  \x1b[32msysinfo\x1b[0m            - Extract server-side environment architecture, uptime & node telemetry.\n' +
          '  \x1b[32mclear\x1b[0m              - Wipe the current terminal viewport memory buffer.\n' +
          '  \x1b[32mlogout\x1b[0m             - Securely terminate session access tokens and clear cookie storage.\n' +
          '  \x1b[32mvisit <path>\x1b[0m       - Fast-travel UI engine route controller execution.\n' +
          '                       \x1b[90mExample: visit /profile\x1b[0m\n' +
          '  \x1b[32mrmaccount\x1b[0m          - Initiate secure identity destruction guidance guidelines.\n';
        
        // Elevated administration manual injected dynamically based on security tokens
        if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
          helpText += 
            '\n\x1b[35m[ ELEVATED PRIVILEGE COMMANDS ]\x1b[0m\n' +
            '  \x1b[32musers\x1b[0m              - Fetch and audit list of registered ecosystem accounts (Max: 10).\n';
            
          if (currentUser.role === 'admin') {
            helpText +=
              '  \x1b[32mban <email>\x1b[0m        - Force-isolate malicious actor email and invalidate active access tokens.\n' +
              '                       \x1b[90mExample: ban user@target.io\x1b[0m\n\n' +
              '\x1b[31m[ ROOT ADMINISTRATION ENGINE (admin subcommands) ]\x1b[0m\n' +
              '  \x1b[34madmin\x1b[0m              - Access comprehensive root administrative pipeline controls.\n' +
              '  \x1b[34madmin user delete <email>\x1b[0m    - Completely erase a user account record from database stores.\n' +
              '  \x1b[34madmin user role <email> <r>\x1b[0m  - Overwrite account privilege access mapping.\n' +
              '                                 \x1b[90mRoles: user | moderator | admin\x1b[0m\n' +
              '  \x1b[34madmin product add <n> <val>\x1b[0m  - Append unique deployment commercial assets into warehouse storage.\n' +
              '  \x1b[34madmin product rm <db_id>\x1b[0m     - Purge commercial item from web store catalogues.\n';
          }
        }
        
        helpText += '\n\x1b[36m=================================================================\x1b[0m';
        return helpText;

      case 'clear':
        return '__CLEAR_SCREEN__';  

      case 'whoami':
        return `User ID: ${currentUser.id}\nRole: [${currentUser.role}] (authenticated)`;

      case 'sysinfo':
        return `OS Node Version: ${process.version}\n` +
               `Platform: ${process.platform}\n` +
               `Uptime: ${Math.floor(process.uptime())}s`; 
      
      case 'logout':
        return '__LOGOUT_USER__';

      case 'rmaccount':
        return 'Please visit /profile to safely and delete your account.';

      // Fixed: Dynamic 'visit' command to trigger frontend redirection
      case 'visit':
        const endpoint = args[1];
        if (!endpoint) {
          return '\x1b[31mUsage: visit <endpoint> (e.g., visit /profile)\x1b[0m';
        }
        // Front-end reference: if output starts with __REDIRECT:__, window.location.href = url
        return `__REDIRECT:${endpoint}__`;
    }

    // --- LEVEL 2: MODERATOR AND ADMINISTRATOR TEAMS ---
    if (cmd === 'users') {
      if (currentUser.role !== 'admin' && currentUser.role !== 'moderator') {
        return '\x1b[31mcore-sh: Permission denied. You need to be a Moderator or Admin.\x1b[0m';
      }

      const users = await UserModel.find().limit(10).select('name email role status');
      let result = 'Registered OS Users:\n';
      users.forEach((u) => {
        const color = u.status === 'banned' ? '\x1b[31m' : '\x1b[32m';
        result += `- ${u.name} [${u.email}] | Role: ${u.role} | Status: ${color}${u.status}\x1b[0m\n`;
      });
      return result.trim();
    }

    if (cmd === 'ban') {
      if (currentUser.role !== 'admin') {
        return '\x1b[31mcore-sh: Permission denied. This is a critical command. Critical actions are restricted for your role.\x1b[0m';
      }

      const targetEmail = args[1];
      if (!targetEmail) {
        return '\x1b[31mUsage: ban <email>\x1b[0m';
      }

      const targetUser = await UserModel.findOne({ email: targetEmail.toLowerCase() });
      if (!targetUser) return '\x1b[31mError: User not found.\x1b[0m';
      if (targetUser._id.toString() === currentUser.id) {
        return '\x1b[31mError: You cannot ban yourself.\x1b[0m';
      }

      targetUser.status = 'banned';
      await targetUser.save();

      await tokenModel.deleteMany({ userID: targetUser._id as any });

      return `\x1b[32mSuccess: User [${targetEmail}] has been banned. Active sessions terminated.\x1b[0m`;
    }

    // --- LEVEL 3: ADMIN TOOL SUITE ('admin' subcommand system) ---
    if (cmd === 'admin') {
      if (currentUser.role !== 'admin') {
        return '\x1b[31mcore-sh: Access denied. Root administration privileges required.\x1b[0m';
      }

      const subCommand = args[1]?.toLowerCase();

      if (!subCommand || subCommand === 'help') {
        return 'Web OS Core Admin Engine:\n' +
               '  admin user delete <email>     - Force completely erase a user account\n' +
               '  admin user role <email> <role>- Modify account access levels (user/moderator/admin)\n' +
               '  admin product add <name> <val>- Register new deployment resource into storage\n' +
               '  admin product rm <id>         - Purge commercial item from data collection';
      }

      // Context branch: Admin operations over user entities
      if (subCommand === 'user') {
        const action = args[2]?.toLowerCase();
        const email = args[3]?.toLowerCase();

        if (!email) return '\x1b[31mError: Targeted user email configuration parameter missing.\x1b[0m';

        const targetUser = await UserModel.findOne({ email });
        if (!targetUser) return '\x1b[31mError: Target identity profile records not found.\x1b[0m';

        // Sub-route: admin user delete
        if (action === 'delete') {
          if (targetUser._id.toString() === currentUser.id) {
            return '\x1b[31mError: Administrative override failed. Cannot execute self-destruction.\x1b[0m';
          }
          await tokenModel.deleteMany({ userID: targetUser._id as any });
          await UserModel.findByIdAndDelete(targetUser._id);
          return `\x1b[32mRoot Action Complete: User account [${email}] permanently wiped from DB.\x1b[0m`;
        }

        // Sub-route: admin user role
        if (action === 'role') {
          const targetRole = args[4]?.toLowerCase() as 'user' | 'moderator' | 'admin';
          if (targetRole !== 'user' && targetRole !== 'moderator' && targetRole !== 'admin') {
            return '\x1b[31mError: Invalid context role target. Choose user, moderator, or admin.\x1b[0m';
          }
          targetUser.role = targetRole;
          await targetUser.save();
          return `\x1b[32mRoot Action Complete: User [${email}] role altered to [${targetRole}].\x1b[0m`;
        }
      }

      // Context branch: Admin operations over catalog storage assets
      if (subCommand === 'product') {
        const action = args[2]?.toLowerCase();

        if (action === 'add') {
          const productName = args[3];
          const productValue = args[4]; // Price, description, etc.
          if (!productName) return '\x1b[31mUsage: admin product add <name> <metadata/price>\x1b[0m';
          
          // Execute your logic with ProductModel here
          // await ProductModel.create({ name: productName, value: productValue });
          return `\x1b[32mCatalog Updated: Product asset "${productName}" successfully saved.\x1b[0m`;
        }

        if (action === 'rm') {
          const productId = args[3];
          if (!productId) return '\x1b[31mUsage: admin product rm <product_database_id>\x1b[0m';
          
          // await ProductModel.findByIdAndDelete(productId);
          return `\x1b[32mCatalog Updated: Product asset "${productId}" evicted from system files.\x1b[0m`;
        }
      }

      return '\x1b[31mcore-sh: Unknown core administration subcommand pipeline.\x1b[0m';
    }

    return `\x1b[31mcore-sh: command not found: ${cmd}\x1b[0m`;
  }
}

export const shService = new ShService();