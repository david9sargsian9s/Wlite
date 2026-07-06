import { IUserDocument } from "../model/userModel";
import { IProduct } from "../model/productModel";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'user' | 'moderator' | 'admin';
      };
      product?: IProduct & { id : string };
    }
  }
}