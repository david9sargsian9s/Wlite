import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// 1. Interface describing user fields in the database
export interface IUser {
  name: string;
  nameLength?: number;
  age: number;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'banned' | 'pending';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for a Mongoose document (includes virtual fields and methods)
export interface IUserDocument extends IUser, Document {
  isAdult: boolean; // Virtual field
}

// 2. Regular expressions for validation
const emailRegex =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(ru|com|net)$/;

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// 3. Creating a schema
const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name is too short (minimum 2 characters)'],
      maxlength: [50, 'Name is too long (maximum 50 characters)']
    },

    nameLength: {
      type: Number
    },

    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Registration is only available to users over 18'],
      max: [120, 'Invalid age specified']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return emailRegex.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid email! The address must contain @ and end in .ru, .com, or .net`
      }
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      validate: {
        validator: function (v: string) {
          return passwordRegex.test(v);
        },
        message:
          'The password is too weak! It must be at least 8 characters long and contain an uppercase letter, a lowercase letter, a number, and a special character (@$!%*?&).'
      }
    },

    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'moderator'],
        message: 'Role {VALUE} is not supported'
      },
      default: 'user'
    },

    status: {
      type: String,
      enum: ['active', 'banned', 'pending'],
      default: 'active'
    }
  },
  {
    versionKey: false,
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

// 4. Middleware: Automatically calculate name length before saving
userSchema.pre('save', async function (this: IUserDocument): Promise<void> {
  if (this.isModified('name')) {
    this.nameLength = this.name.length;
  }

  return;
});

// 5. Password hashing
userSchema.pre('save', async function (
  this: IUserDocument
): Promise<void> {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

// 6. Virtual field
userSchema.virtual('isAdult').get(function (this: IUserDocument) {
  return this.age >= 21;
});

// 7. Export the model
export const UserModel = model<IUserDocument>('users', userSchema);