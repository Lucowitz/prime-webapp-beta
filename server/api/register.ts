import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataFilePath = path.join(__dirname, '..', 'db', 'users.txt');

const sanitizeAndHash = (data: string): string => {
  return data.trim(); // Store data in plaintext
};

const generateValidationURL = () => {
  return `validation-${uuidv4()}`;
};

const registerValidationRules = [
  body('Nome').trim().notEmpty().withMessage('Name is required').escape(),
  body('Cognome').trim().notEmpty().withMessage('Surname is required').escape(),
  body('Indirizzo').trim().notEmpty().withMessage('Address is required').escape(),
  body('Codice Fiscale').trim().notEmpty().withMessage('Fiscal Code is required').isLength({ min: 16, max: 16 }).matches(/^[A-Z0-9]+$/).withMessage('Invalid Fiscal Code format').escape(),
  body('Email').trim().isEmail().withMessage('Email is required and must be valid').escape(),
  body('Numero di Telefono').trim().isMobilePhone('it-IT').optional().escape(),
  body('Password').trim().isLength({ min: 8 }).withMessage('Password must be at least 8 characters').escape(),
  body('Nome Azienda').if(body('isBusiness').equals('true')).trim().notEmpty().withMessage('Company Name is required').escape(),
  body('P.IVA').if(body('isBusiness').equals('true')).trim().notEmpty().withMessage('VAT Number is required')
    .isLength({ min: 11, max: 11 }).matches(/^[0-9]+$/).withMessage('Invalid VAT Number format').escape(),
  body('Email Commerciale').if(body('isBusiness').equals('true')).trim().isEmail().withMessage('Commercial email is required and must be valid').escape(),
];

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'testtesttesttestciao@gmail.com',
    pass: 'qnew yebc miqv xqrs',
  },
});

router.post('/', registerValidationRules, async (req: Request, res: Response) => {
  console.log('Received registration request:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { isBusiness, Password, Email, EmailCommerciale, ...userData } = req.body;

  let sanitizedData: any = {};
  if (isBusiness) {
    sanitizedData = {
      nomeAzienda: userData["Nome Azienda"].trim(),
      piva: userData.P.IVA.trim(),
      emailCommerciale: EmailCommerciale.trim(),
    };
  } else {
    sanitizedData = {
      nome: userData.Nome.trim(),
      cognome: userData.Cognome.trim(),
      indirizzo: userData.Indirizzo.trim(),
      codiceFiscale: userData["Codice Fiscale"].trim(),
      email: Email.trim(),
      numeroTelefono: userData["Numero di Telefono"] ? userData["Numero di Telefono"].trim() : undefined,
    };
  }
  const hashedPassword = Password.trim(); // Store password in plaintext

  const totpSecret = authenticator.generateSecret();

  const user = {
    id: uuidv4(),
    isBusiness,
    ...sanitizedData,
    hashedPassword,
    totpSecret,
  };
  console.log('User data before saving (temporary):', user);

  try {
    fs.appendFileSync(dataFilePath, JSON.stringify(user) + '\n');
    console.log('User data saved to file.');
  } catch (err) {
    console.error("Error saving user data:", err);
    return res.status(500).json({ message: "Failed to save user data." });
  }

  const mailOptions = {
    from: 'testtesttesttestciao@gmail.com',
    to: isBusiness ? EmailCommerciale : Email,
    subject: 'Registration Confirmation',
    text: 'Thank you for registering! Your registration was completed.',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ message: "Failed to send confirmation email. Registration incomplete.", error });
    } else {
      console.log('Email sent:', info.response);

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, isBusiness: user.isBusiness }, 'your-secret-key', { expiresIn: '1h' });

      // Include the totpSecret and validationUrl in the JSON response
      res.status(200).json({ message: "Registration initiated. Check your email.", token });
    }
  });
});

router.post('/validate-totp', (req: Request, res: Response) => {
  const { totp } = req.body; // Get the TOTP code from the request body
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is missing.' });
  }

  if (!totp) {
    return res.status(400).json({ message: 'TOTP code is missing.' });
  }

  let user: any = null;
  try {
    const lines = fs.readFileSync(dataFilePath, 'utf-8').split('\n');
    for (const line of lines) {
      if (line) {
        const parsedUser = JSON.parse(line);
        if (parsedUser.id === userId) {
          user = parsedUser;
          break;
        }
      }
    }
  } catch (error) {
    console.error("Error reading user data:", error);
    return res.status(500).json({ message: 'Error reading user data.' });
  }

  if (!user) {
    return res.status(404).json({ message: 'Invalid User ID. User not found.' });
  }

  const isValidTotp = authenticator.verify({
    token: totp,
    secret: user.totpSecret,
    window: 1 // Add a window of 1 to allow for slight time drift
  });

  if (!isValidTotp) {
    return res.status(401).json({ message: 'Invalid TOTP code' });
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, isBusiness: user.isBusiness }, 'your-secret-key', { expiresIn: '1h' });

  res.status(200).json({ message: 'TOTP validation successful', token });
});

router.get('/login', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login</title>
    </head>
    <body>
      <h1>Login</h1>
      <p>Please log in to your account.</p>
      <a href="/">Go to Main Page</a>
    </body>
    </html>
  `);
});

export default router;