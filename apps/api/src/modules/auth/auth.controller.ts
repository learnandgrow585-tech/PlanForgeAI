import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { ZodBody } from '../../common/zod-validation.pipe';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
const RefreshSchema = z.object({ refreshToken: z.string() });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodBody(RegisterSchema)) body: z.infer<typeof RegisterSchema>) {
    return this.auth.register(body.email, body.password, body.name);
  }

  @Post('login')
  login(@Body(new ZodBody(LoginSchema)) body: z.infer<typeof LoginSchema>) {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body(new ZodBody(RefreshSchema)) body: z.infer<typeof RefreshSchema>) {
    return this.auth.refresh(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    // Return full profile from DB so name, tier etc. are always up to date
    return this.auth.getProfile(user.sub);
  }
}
