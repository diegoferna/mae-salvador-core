import { Injectable } from "@nestjs/common";
import { JwtService as NestJwtService } from "@nestjs/jwt";

export interface JwtPayload {
  sub: string;
  iss: string;
}

@Injectable()
export class JwtService {
  constructor(private readonly nestJwt: NestJwtService) {}

  sign(sub: string, iss: string): Promise<string> {
    return this.nestJwt.signAsync({ sub, iss });
  }

  verify(token: string): Promise<JwtPayload> {
    return this.nestJwt.verifyAsync<JwtPayload>(token);
  }
}
