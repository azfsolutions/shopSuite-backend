import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { TeamMemberService } from './services/team-member.service';
import { InvitationService } from './services/invitation.service';
import { PrismaModule } from '../../database/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TeamController],
    providers: [TeamMemberService, InvitationService, TeamService],
    exports: [TeamService],
})
export class TeamModule {}
