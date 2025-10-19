import {AnyObject, Filter, repository} from '@loopback/repository';
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

import {FsaeRole, Sponsor, Notification} from '../models';
import {SponsorRepository} from '../repositories';
import {AnnouncementRepository} from '../repositories/announcements.repository';
import {
  SponsorProfileDto,
  SponsorProfileDtoFields,
} from '../dtos/sponsor-profile.dto';
import {ownerOnly} from '../decorators/owner-only.decorator';
import {validateEmail} from '../utils/validateEmail';
import {FileHandlerService} from '../services/file-handling.service';

@authenticate('fsae-jwt')
export class SponsorController {
  private fileHandler: FileHandlerService;

  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @inject(SecurityBindings.USER) protected currentUserProfile: UserProfile,
    @repository(SponsorRepository) public sponsorRepository: SponsorRepository,
    @repository(AnnouncementRepository)
    public announcementRepository: AnnouncementRepository,
  ) {
    this.fileHandler = new FileHandlerService(this.sponsorRepository);
  }

  @authorize({
    allowedRoles: [
      FsaeRole.ALUMNI,
      FsaeRole.MEMBER,
      FsaeRole.SPONSOR,
      FsaeRole.ADMIN,
    ],
  })
  @get('/user/sponsor')
  @response(200, {
    description: 'Array of Sponsor model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Sponsor, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(Sponsor) filter?: Filter<Sponsor>,
  ): Promise<Sponsor[]> {
    return this.sponsorRepository.find(filter);
  }

  @authorize({
    allowedRoles: [
      FsaeRole.SPONSOR,
      FsaeRole.MEMBER,
      FsaeRole.ALUMNI,
      FsaeRole.ADMIN,
    ],
  })
  @get('/user/sponsor/{id}')
  @response(200, {
    description: 'Sponsor model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(SponsorProfileDto, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
  ): Promise<SponsorProfileDto> {
    return this.sponsorRepository.findById(id, SponsorProfileDtoFields);
  }

  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @ownerOnly({ownerField: 'id'})
  @patch('/user/sponsor/{id}')
  @response(204, {description: 'Sponsor PATCH success'})
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(SponsorProfileDto, {partial: true}),
        },
      },
    })
    sponsorDto: Partial<SponsorProfileDto>,
  ): Promise<void> {
    if ('email' in sponsorDto) {
      const {valid, message} = validateEmail(sponsorDto);
      if (!valid) throw new HttpErrors.BadRequest(message);
    }
    await this.sponsorRepository.updateById(id, sponsorDto);
  }

  @authorize({allowedRoles: [FsaeRole.ADMIN, FsaeRole.SPONSOR]})
  @ownerOnly({ownerField: 'id'})
  @del('/user/sponsor/{id}')
  @response(204, {description: 'Sponsor DELETE success'})
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.sponsorRepository.deleteById(id);
  }

  @post('user/sponsor/{id}/upload-avatar')
  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @response(200, {description: 'Avatar uploaded successfully'})
  async uploadAvatar(@inject(RestBindings.Http.RESPONSE) response: Response) {
    return this.fileHandler.handleUpload(
      this.sponsorRepository,
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
  @get('/user/sponsor/{id}/avatar')
  async viewAvatar(
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    return this.fileHandler.handleViewFile(
      this.sponsorRepository,
      id,
      'avatarS3Key',
      response,
      true,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR, FsaeRole.ADMIN]})
  @patch('/user/sponsor/{id}/delete-avatar')
  async deleteAvatar(@param.path.string('id') id: string) {
    return this.fileHandler.handleDeleteFile(
      this.sponsorRepository,
      id,
      'avatarS3Key',
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @post('user/sponsor/{id}/upload-banner')
  @response(200, {description: 'Banner uploaded successfully'})
  async uploadBanner(@inject(RestBindings.Http.RESPONSE) response: Response) {
    return this.fileHandler.handleUpload(
      this.sponsorRepository,
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
  @get('/user/sponsor/{id}/banner')
  async viewBanner(
    @param.path.string('id') id: string,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ) {
    return this.fileHandler.handleViewFile(
      this.sponsorRepository,
      id,
      'bannerS3Key',
      response,
      true,
    );
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR, FsaeRole.ADMIN]})
  @patch('/user/sponsor/{id}/delete-banner')
  async deleteBanner(@param.path.string('id') id: string) {
    return this.fileHandler.handleDeleteFile(
      this.sponsorRepository,
      id,
      'bannerS3Key',
    );
  }

  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @ownerOnly({ownerField: 'id'})
  @patch('/user/sponsor/notifications/{id}/read-all')
  @response(204, {description: 'Notifications marked as read'})
  async markAllNotificationsAsRead(
    @param.path.string('id') id: string,
  ): Promise<void> {
    const {count} = await this.sponsorRepository.count({
      and: [{id}, {'notifications.0': {exists: true}} as AnyObject],
    });
    if (count === 0) return;

    await this.sponsorRepository.updateById(id, {
      $set: {'notifications.$[].read': true},
    } as AnyObject);
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @ownerOnly({ownerField: 'id'})
  @get('/user/sponsor/notifications/{id}')
  @response(200, {description: 'All notifications for user'})
  async getNotifications(@param.path.string('id') id: string): Promise<{
    notifications: Notification[];
    hasUnread: boolean;
    unreadCount: number;
  }> {
    const user = await this.sponsorRepository.findById(id, {
      fields: {notifications: true, id: true},
    });
    const notifications = (user.notifications ?? []).sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
    const unreadCount = notifications.reduce((n, x) => n + (x.read ? 0 : 1), 0);
    return {notifications, hasUnread: unreadCount > 0, unreadCount};
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @get('/user/sponsor/announcements')
  @response(200, {description: 'All announcements for sponsors'})
  async getAnnouncements(): Promise<{
    announcements: Notification[];
    hasUnread: boolean;
    unreadCount: number;
  }> {
    const sponsorId = this.currentUserProfile.id as string;
    const sponsor = await this.sponsorRepository.findById(sponsorId, {
      fields: {lastSeenAnnouncementsAt: true, createdAt: true},
    } as AnyObject);

    const lastSeen: Date =
      (sponsor as AnyObject).lastSeenAnnouncementsAt ?? new Date(0);
    const joinedAt: Date = (sponsor as AnyObject).createdAt ?? new Date();

    const audienceWhere: AnyObject = {
      or: [{userRole: 'sponsor'}, {userRole: {exists: false}}, {userRole: []}],
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
  @authorize({allowedRoles: [FsaeRole.SPONSOR]})
  @post('/user/sponsor/announcements/ack')
  @response(204, {description: 'Announcements acknowledged'})
  async ackAnnouncements(): Promise<void> {
    const sponsorId = this.currentUserProfile.id as string;
    await this.sponsorRepository.updateById(sponsorId, {
      lastSeenAnnouncementsAt: new Date(),
    });
  }
}
