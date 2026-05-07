import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { timingSafeEqual, scryptSync } from "node:crypto";

@Injectable()
export class PasswordService {
  async verify(plain: string, storedHash: string): Promise<boolean> {
    if (!storedHash) return false;

    // Legacy format from Next API: "salt:hash" (scrypt).
    if (storedHash.includes(":")) {
      const [salt, hash] = storedHash.split(":");
      if (!salt || !hash) return false;
      const computed = scryptSync(plain, salt, 64).toString("hex");
      const left = Buffer.from(computed, "hex");
      const right = Buffer.from(hash, "hex");
      if (left.length !== right.length) return false;
      return timingSafeEqual(left, right);
    }

    // New format.
    return bcrypt.compare(plain, storedHash);
  }
}
