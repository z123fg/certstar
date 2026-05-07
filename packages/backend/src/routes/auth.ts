import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const expiresIn = 8 * 60 * 60;
  const token = jwt.sign({ username }, process.env.JWT_SECRET!, { expiresIn });
  res.json({ token, expiresIn });
});

export default router;
