import { AccessControl } from 'accesscontrol';

const ac = new AccessControl();

// 1. Permissions for the USER role
ac.grant('user')
    .readAny('product') // Can view any products
    .readOwn('user') // Can view their profile
    .updateOwn('user') // Can update their profile
    .deleteOwn('user'); // Can delete their profile

// 2. Permissions for the MODERATOR role
ac.grant('moderator')
    .extend('user') // Inherits everything from user
    .createAny('product') // Can create products
    .updateAny('product') // Can edit any products
    .deleteAny('product') // Can delete any products
    .readAny('user'); // Can view other people's profiles

// 3. Permissions for the ADMIN role
ac.grant('admin')
    .extend('moderator') // Inherits everything from moderator
    .createAny('user') // Can create users
    .updateAny('user') // Can modify any user
    .deleteAny('user'); // Can delete any user

export default ac;