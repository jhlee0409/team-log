import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { UserService } from "./user.service";

@ApiTags("auth")
@ApiBearerAuth("JWT-auth")
@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({
    summary: "Get current user details",
    description: "Returns detailed information about the authenticated user",
  })
  @ApiResponse({
    status: 200,
    description: "User details returned",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @Get("me")
  async getMe(@Req() req) {
    return this.userService.findById(req.user.id);
  }
}
