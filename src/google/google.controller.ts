import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  Response,
  UseGuards,
} from '@nestjs/common';
import { formatResponse } from '../utils/helper-util';
import { GoogleSerivce } from './google.service';
import { Public } from '../authentication/constants';
import { UserService } from '../user/user.service';

@Controller('auth/google')
export class GoogleController {
  constructor(
    private readonly googleService: GoogleSerivce,
    private readonly userService: UserService,
  ) {}

  private readonly logger = new Logger(GoogleController.name);
  @Public()
  @Get('url')
  async getUrl(@Res() res, @Query('email') email?: string) {
    return formatResponse(
      this.logger,
      this.googleService.getGoogleAuth(email),
      res,
      `getting auth url`,
    );
  }

  // Get Google OAuth URL for adding new inbox to authenticated user
  @Get('url/add-inbox')
  async getUrlForAddInbox(@Res() res, @Req() req) {
    // Pass the user's email to link the new inbox to this user
    return formatResponse(
      this.logger,
      this.googleService.getGoogleAuth(req.user.username),
      res,
      `getting auth url for adding inbox`,
    );
  }

  @Public()
  @Get('verify')
  async verifyCode(
    @Res() res,
    @Query('code') code: string,
    @Query('state') state?: string,
  ) {
    const result = await this.googleService.verifyCode(code, state);
    const token = result.token || '';
    res.send(
      `<!DOCTYPE html><html lang="en"><head></head><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: '${token}' }, '*');
        }
        window.close();
      </script></body></html>`,
    );
  }

  // Delete credential (disconnect inbox)
  @Delete('credentials/:id')
  async deleteCredential(
    @Res() res,
    @Req() req,
    @Param('id') credentialId: string,
  ) {
    return formatResponse(
      this.logger,
      this.disconnectInbox(credentialId, req.user.id),
      res,
      'disconnecting inbox',
    );
  }

  private async disconnectInbox(credentialId: string, userId: string) {
    // First, get the credential to stop the watch
    const credential = await this.userService.findCredentialById(credentialId, [
      'user',
    ]);

    if (!credential || credential.user.id !== userId) {
      throw new Error('Credential not found or access denied');
    }

    // Stop the Gmail watch for this credential
    try {
      await this.googleService.stopWatchForCredential(credential);
      this.logger.log(`Stopped watch for credential ${credential.inboxEmail}`);
    } catch (error) {
      this.logger.warn(
        `Failed to stop watch for ${credential.inboxEmail}, continuing with deletion`,
        error,
      );
      // Continue with deletion even if stopWatch fails
    }

    // Delete the credential and all associated emails
    const result = await this.userService.deleteCredentialAndEmails(
      credentialId,
      userId,
    );

    return result;
  }
}
