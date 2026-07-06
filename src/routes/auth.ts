import express from 'express';
import AuthController from '../controller/AuthController';

import getAccessFromCheck from '../middlewares/getAccessToken';
import getRefreshFromCheck from '../middlewares/getRefreshToken';

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

export default router;