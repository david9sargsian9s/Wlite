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
        let helpText = 'Web OS Available commands:\n' +
                       '  help               - Show this manual\n' +
                       '  whoami             - Show current active user\n' +
                       '  sysinfo            - Get server environment stats\n' +
                       '  visit <endpoint>   - Fast navigation (e.g., visit /profile)';
        
        if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
          helpText += '\n\n[Management Commands]:\n' +
                      '  users              - List registered accounts (Moderator/Admin)\n' +
                      '  ban                - Ban user by email (Admin only)\n' +
                      '  admin              - CLI Administration Tool Suite (Admin only)';
        }
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