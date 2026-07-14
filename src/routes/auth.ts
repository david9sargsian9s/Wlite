import express from 'express';
import AuthController from '../controller/AuthController';

import getAccessFromCheck from '../middlewares/getAccessToken';
import getRefreshFromCheck from '../middlewares/getRefreshToken';

import { getGoogleAuthUrl, handleGoogleCallback } from '../controller/googleAuthController';

const router = express.Router();
const auth = new AuthController();

/* POST token. */
router.post('/login', auth.getToken);

/* GET user info. */
router.get("/get", getAccessFromCheck, auth.getUser);

/* GET access token. */
router.get('/getAccess', getRefreshFromCheck, auth.getNewAccessToken);

/* GET to clear cookie. */
router.get("/clear", auth.clearCookie);

// The route that our CLI command `wfs connect` will invoke
router.get('/auth/google', getAccessFromCheck, getGoogleAuthUrl);

// The route Google will return the user to after verifying access rights
router.get('/auth/google/callback', handleGoogleCallback);

export default router;