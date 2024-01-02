import { Request, Response } from "express";
import { prisma } from "@/services/db.js";

export async function getUsers(req: Request, res: Response) {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      claims: true
    }
  });
  await res.status(200).send(users);
}
