import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { authenticator } from 'otplib';
import jwt from 'jsonwebtoken';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataFilePath = path.join(__dirname, '..', 'db', 'users.txt');

const loginValidationRules = [
    body('password').trim().notEmpty().withMessage('Password is required').escape(),
    body('totp').trim().notEmpty().withMessage('TOTP code is required').escape(),
];

router.post('/', loginValidationRules, async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { password, totp, isBusiness } = req.body;
    const identifier = isBusiness ? req.body.piva : req.body.codiceFiscale;

    console.log("Login attempt:", { isBusiness, identifier }); // Debug log

    let user: any = null;
    try {
        const lines = fs.readFileSync(dataFilePath, 'utf-8').split('\n');
        for (const line of lines) {
            if (line) {
                const parsedUser = JSON.parse(line);

                if (parsedUser.codiceFiscale === identifier) {
                    user = parsedUser;
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Error reading user data:", error);
        return res.status(500).json({ message: "Error reading user data." });
    }

    if (!user) {
        return res.status(404).json({ message: 'Invalid Codice Fiscale/P.IVA' });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid password' });
    }

    const isValidTotp = authenticator.verify({
        token: totp,
        secret: user.totpSecret,
        window: 1
    });

    if (!isValidTotp) {
        return res.status(401).json({ message: 'Invalid TOTP code' });
    }
// TODO MODIFY SECRET KEY (THE STRING)
    const token = jwt.sign({ userId: user.id, isBusiness: user.isBusiness }, 'AAAAAAA', { expiresIn: '1h' });

    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
        sameSite: 'strict', // Protect against CSRF
        maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({ message: 'Login successful', token: token });
});

export default router;
