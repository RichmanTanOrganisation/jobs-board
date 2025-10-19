import {AnyObject, repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  del,
  requestBody,
  response,
  HttpErrors,
  RestBindings,
  Response,
  Request,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {SecurityBindings, UserProfile} from '@loopback/security';

import {FsaeRole, Notification} from '../models';
import {MemberRepository} from '../repositories';
import {AnnouncementRepository} from '../repositories/announcements.repository';
import {
  MemberProfileDto,
  MemberProfileDtoFields,
} from '../dtos/member-profile.dto';
import {ownerOnly} from '../decorators/owner-only.decorator';
import {validateEmail} from '../utils/validateEmail';
import {FileHandlerService} from '../services/file-handling.service';

@authenticate('fsae-jwt')
export class MemberController {
  private fileHandler: FileHandlerService;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(MemberRepository) public memberRepository: MemberRepository,
    @repository(AnnouncementRepository)
    public announcementRepository: AnnouncementRepository,
  ) {
    this.fileHandler = new FileHandlerService(this.memberRepository);
  }

  @authorize({
    allowedRoles: [FsaeRole.ADMIN, FsaeRole.ALUMNI, FsaeRole.SPONSOR],
  })
  @get('/user/member')
  @response(200, {
    description: 'Get member list (flat, filtered, selected fields only)',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              firstName: {type: 'string'},
              lastName: {type: 'string'},
              lookingFor: {type: 'string'},
              subGroup: {type: 'string'},
              avatarURL: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async fetchUserList(
    @param.query.string('lookingFor') lookingFor?: string | string[],
    @param.query.string('subGroup') subGroup?: string | string[],
  ) {
    const where: AnyObject = {};

    const normalize = (v?: string | string[]): string[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
      return String(v)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    };

    const lookingForArr = normalize(lookingFor);
    const subGroupArr = normalize(subGroup);

    if (lookingForArr.length) where.lookingFor = {inq: lookingForArr};
    if (subGroupArr.length) where.subGroup = {inq: subGroupArr};

    return this.memberRepository.find({
      where,
      order: ['id DESC'],
      fields: {
        id: true,
        firstName: true,
        lastName: true,
        lookingFor: true,
        subGroup: true,
        avatarURL: true,
      },
    });
  }

  @authorize({
    allowedRoles: [
      FsaeRole.MEMBER,
      FsaeRole.SPONSOR,
      FsaeRole.ALUMNI,
      FsaeRole.ADMIN,
    ],
  })
  @get('/user/member/{id}')
  @response(200, {
    description: 'Member model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(MemberProfileDto, {includeRelations: true}),
      },
    },
  })
  async fetchUserProfile(
    @param.path.string('id') id: string,
  ): Promise<MemberProfileDto | null> {
    const result = await this.memberRepository.findById(id, {
      fields: MemberProfileDtoFields,
    });
    return result as MemberProfileDto;
  }

  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @ownerOnly({ownerField: 'id'})
  @patch('/user/member/{id}')
  @response(204, {description: 'Member PATCH success'})
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(MemberProfileDto, {partial: true}),
        },
      },
    })
    memberDto: Partial<MemberProfileDto>,
  ): Promise<void> {
    if ('email' in memberDto) {
      const {valid, message} = validateEmail(memberDto);
      if (!valid) throw new HttpErrors.BadRequest(message);
    }
    await this.memberRepository.updateById(id, memberDto);
  }

  @authorize({allowedRoles: [FsaeRole.MEMBER, FsaeRole.ADMIN]})
  @ownerOnly({ownerField: 'id'})
  @del('/user/member/{id}')
  @response(204, {description: 'Member DELETE success'})
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.memberRepository.deleteById(id);
  }

  @post('user/member/{id}/upload-cv')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @response(200, {description: 'CV uploaded successfully'})
  async uploadCV(
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<any> {
    return this.fileHandler.handleUpload(
      this.memberRepository,
      this.currentUserProfile,
      this.req,
      'cv',
      'cvS3Key',
      response,
      true,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({
    allowedRoles: [
      FsaeRole.MEMBER,
      FsaeRole.ADMIN,
      FsaeRole.ALUMNI,
      FsaeRole.SPONSOR,
    ],
  })
  @get('/user/member/{id}/cv')
  @response(200, {description: 'Return member CV file'})
  @response(404, {description: 'CV not found'})
  async downloadCV(
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    return this.fileHandler.handleViewFile(
      this.memberRepository,
      id,
      'cvS3Key',
      response,
      true,
    );
  }

  @authorize({allowedRoles: [FsaeRole.MEMBER, FsaeRole.ADMIN]})
  @ownerOnly({ownerField: 'id'})
  @patch('/user/member/{id}/delete-cv')
  @response(204, {description: 'CV deleted successfully'})
  async deleteCV(@param.path.string('id') id: string) {
    return this.fileHandler.handleDeleteFile(
      this.memberRepository,
      id,
      'cvS3Key',
      'hasCV',
    );
  }

  @post('user/member/{id}/upload-avatar')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @response(200, {description: 'Avatar uploaded successfully'})
  async uploadAvatar(@inject(RestBindings.Http.RESPONSE) response: Response) {
    return this.fileHandler.handleUpload(
      this.memberRepository,
      this.currentUserProfile,
      this.req,
      'avatar',
      'avatarS3Key',
      response,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({
    allowedRoles: [
      FsaeRole.MEMBER,
      FsaeRole.ADMIN,
      FsaeRole.ALUMNI,
      FsaeRole.SPONSOR,
    ],
  })
  @get('/user/member/{id}/avatar')
  async viewAvatar(
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    return this.fileHandler.handleViewFile(
      this.memberRepository,
      id,
      'avatarS3Key',
      response,
      true,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER, FsaeRole.ADMIN]})
  @patch('/user/member/{id}/delete-avatar')
  async deleteAvatar(@param.path.string('id') id: string) {
    return this.fileHandler.handleDeleteFile(
      this.memberRepository,
      id,
      'avatarS3Key',
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @post('user/member/{id}/upload-banner')
  @response(200, {description: 'Banner uploaded successfully'})
  async uploadBanner(@inject(RestBindings.Http.RESPONSE) response: Response) {
    return this.fileHandler.handleUpload(
      this.memberRepository,
      this.currentUserProfile,
      this.req,
      'banner',
      'bannerS3Key',
      response,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({
    allowedRoles: [
      FsaeRole.MEMBER,
      FsaeRole.ADMIN,
      FsaeRole.ALUMNI,
      FsaeRole.SPONSOR,
    ],
  })
  @get('/user/member/{id}/banner')
  async viewBanner(
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    return this.fileHandler.handleViewFile(
      this.memberRepository,
      id,
      'bannerS3Key',
      response,
      true,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER, FsaeRole.ADMIN]})
  @patch('/user/member/{id}/delete-banner')
  async deleteBanner(@param.path.string('id') id: string) {
    return this.fileHandler.handleDeleteFile(
      this.memberRepository,
      id,
      'bannerS3Key',
    );
  }

  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @ownerOnly({ownerField: 'id'})
  @patch('/user/member/notifications/{id}/read-all')
  @response(204, {description: 'Notifications marked as read'})
  async markAllNotificationsAsRead(
    @param.path.string('id') id: string,
  ): Promise<void> {
    const {count} = await this.memberRepository.count({
      and: [{id}, {'notifications.0': {exists: true}} as AnyObject],
    });
    if (count === 0) return;

    await this.memberRepository.updateById(id, {
      $set: {'notifications.$[].read': true},
    } as AnyObject);
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @ownerOnly({ownerField: 'id'})
  @get('/user/member/notifications/{id}')
  @response(200, {description: 'All notifications for user'})
  async getNotifications(@param.path.string('id') id: string): Promise<{
    notifications: Notification[];
    hasUnread: boolean;
    unreadCount: number;
  }> {
    const user = await this.memberRepository.findById(id, {
      fields: {notifications: true, id: true},
    });
    const notifications = (user.notifications ?? []).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    const unreadCount = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0);
    return {notifications, hasUnread: unreadCount > 0, unreadCount};
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @get('/user/member/announcements')
  @response(200, {description: 'All announcements for members'})
  async getAnnouncements(): Promise<{
    announcements: Notification[];
    hasUnread: boolean;
    unreadCount: number;
  }> {
    const memberId = this.currentUserProfile.id as string;
    const member = await this.memberRepository.findById(memberId, {
      fields: {lastSeenAnnouncementsAt: true, createdAt: true},
    });

    const lastSeen: Date =
      (member as AnyObject).lastSeenAnnouncementsAt ?? new Date(0);
    const joinedAt: Date = (member as AnyObject).createdAt ?? new Date();

    const audienceWhere: AnyObject = {
      or: [{userRole: 'member'}, {userRole: {exists: false}}, {userRole: []}],
    };

    const items = await this.announcementRepository.find({
      where: {and: [audienceWhere, {createdAt: {gte: joinedAt}}]} as AnyObject,
      order: ['createdAt DESC'],
      limit: 10,
    });

    const announcements = items
      .map(a => ({
        ...(a as AnyObject),
        read: new Date(a.createdAt).getTime() <= lastSeen.getTime(),
      }))
      .map(x => x as Notification);

    const {count} = await this.announcementRepository.count({
      and: [
        audienceWhere,
        {createdAt: {gt: lastSeen}},
        {createdAt: {gte: joinedAt}},
      ],
    } as AnyObject);

    return {announcements, hasUnread: count > 0, unreadCount: count};
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.MEMBER]})
  @post('/user/member/announcements/ack')
  @response(204, {description: 'Announcements acknowledged'})
  async ackAnnouncements(): Promise<void> {
    const memberId = this.currentUserProfile.id as string;
    await this.memberRepository.updateById(memberId, {
      lastSeenAnnouncementsAt: new Date(),
    });
  }
}
