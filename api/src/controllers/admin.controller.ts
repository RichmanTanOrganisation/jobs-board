import {repository} from '@loopback/repository';
import {service, inject, CoreBindings, Application} from '@loopback/core';
import {
  del,
  get,
  HttpErrors,
  param,
  patch,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {authorize} from '@loopback/authorization';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';

import {Alumni, FsaeRole, FsaeUser, Member, Sponsor, Admin} from '../models';
import {AdminStatus} from '../models/admin.status';
import {Notification} from '../models/notification.model';
import {NotificationType} from '../models/notification.type';

import {
  AlumniRepository,
  MemberRepository,
  SponsorRepository,
  AdminLogRepository,
  AdminRepository,
} from '../repositories';
import {AnnouncementRepository} from '../repositories/announcements.repository';

import {AdminLogService} from '../services/admin-log.service';
import {PasswordHasherService} from '../services/password-hasher.service';

import {AdminReview} from './controller-types/admin.controller.types';
import {randomUUID} from 'crypto';

@authenticate('fsae-jwt')
export class AdminController {
  constructor(
    @repository(AlumniRepository) private alumniRepository: AlumniRepository,
    @repository(MemberRepository) private memberRepository: MemberRepository,
    @repository(SponsorRepository) private sponsorRepository: SponsorRepository,
    @repository(AdminRepository) private adminRepository: AdminRepository,
    @repository(AdminLogRepository)
    private adminLogRepository: AdminLogRepository,
    @repository(AnnouncementRepository)
    private announcementRepository: AnnouncementRepository,
    @service(AdminLogService) private adminLogService: AdminLogService,
    @inject(SecurityBindings.USER) private currentUser: UserProfile,
    @inject(CoreBindings.APPLICATION_INSTANCE) private app: Application,
  ) {}

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @get('/user/admin/dashboard')
  @response(200, {
    description: 'Array of users awaiting (or finished) admin review',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              contact: {type: 'string'},
              email: {type: 'string', format: 'email'},
              name: {type: 'string'},
              role: {type: 'string'},
              date: {type: 'string', format: 'date-time'},
              status: {type: 'string'},
            },
          },
        },
      },
    },
  })
  async getAllUsers(): Promise<AdminReview[]> {
    const [alumni, members, sponsors] = await Promise.all([
      this.alumniRepository.find(),
      this.memberRepository.find(),
      this.sponsorRepository.find(),
    ]);

    const toReview = (
      u: Alumni | Member | Sponsor,
      role: FsaeRole,
    ): AdminReview => {
      const id = u.id.toString();
      const name =
        'firstName' in u
          ? `${(u as any).firstName} ${(u as any).lastName}`
          : 'companyName' in u
            ? (u as any).companyName
            : '';
      const created =
        (u as any).createdAt ?? new Date(parseInt(id.slice(0, 8), 16) * 1000);
      return {
        id,
        contact: (u as any).phoneNumber ?? '',
        name: name ?? '',
        email: (u as any).email ?? '',
        role,
        date: created,
        status: (u as any).adminStatus ?? AdminStatus.PENDING,
      };
    };

    return [
      ...alumni.map(a => toReview(a, FsaeRole.ALUMNI)),
      ...members.map(m => toReview(m, FsaeRole.MEMBER)),
      ...sponsors.map(s => toReview(s, FsaeRole.SPONSOR)),
    ];
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @patch('/user/admin/status/{id}')
  @response(204, {description: 'Admin status updated'})
  async updateUserStatus(
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      description: 'Target role and new status',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['role', 'status'],
            properties: {
              role: {
                type: 'string',
                enum: [FsaeRole.ALUMNI, FsaeRole.MEMBER, FsaeRole.SPONSOR],
              },
              status: {
                type: 'string',
                enum: [AdminStatus.APPROVED, AdminStatus.REJECTED],
              },
            },
          },
        },
      },
    })
    body: {role: FsaeRole; status: AdminStatus},
  ): Promise<void> {
    const {role, status} = body;

    const repo =
      role === FsaeRole.ALUMNI
        ? this.alumniRepository
        : role === FsaeRole.MEMBER
          ? this.memberRepository
          : role === FsaeRole.SPONSOR
            ? this.sponsorRepository
            : undefined;

    if (!repo) throw new HttpErrors.BadRequest(`Unsupported role "${role}"`);

    try {
      await repo.updateById(id, {adminStatus: status} as any);
      const user = await repo.findById(id);
      await this.adminLogService.createAdminLog(
        this.currentUser[securityId] as string,
        {
          message: `Application by ${(user as any).email} was ${status.toLowerCase()}`,
          applicationStatus: status.toLowerCase(),
          userEmail: (user as any).email,
          userRole: role.toLowerCase(),
          userId: id,
        },
      );
    } catch (e: any) {
      if (e.code === 'ENTITY_NOT_FOUND') {
        throw new HttpErrors.NotFound(
          `User ${id} not found in ${role} collection`,
        );
      }
      throw e;
    }
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @patch('/user/admin/deactivate/{id}')
  @response(204, {description: 'User account deactivated'})
  async deactivateUser(
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      description: 'User role and deactivation reason',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['role', 'reason'],
            properties: {
              role: {
                type: 'string',
                enum: [FsaeRole.ALUMNI, FsaeRole.MEMBER, FsaeRole.SPONSOR],
              },
              reason: {type: 'string'},
            },
          },
        },
      },
    })
    body: {role: FsaeRole; reason: string},
  ): Promise<void> {
    const {role, reason} = body;

    const repo =
      role === FsaeRole.ALUMNI
        ? this.alumniRepository
        : role === FsaeRole.MEMBER
          ? this.memberRepository
          : role === FsaeRole.SPONSOR
            ? this.sponsorRepository
            : undefined;

    if (!repo) throw new HttpErrors.BadRequest(`Unsupported role "${role}"`);

    try {
      await repo.updateById(id, {activated: false} as any);
      const thisUser = await repo.findById(id);
      await this.adminLogService.createAdminLog(
        this.currentUser[securityId] as string,
        {
          message: `Account ${(thisUser as any).email} deactivated`,
          reason,
          accountEmail: (thisUser as any).email,
          accountRole: role.toLowerCase(),
          accountUserId: id,
        },
      );
    } catch (e: any) {
      if (e.code === 'ENTITY_NOT_FOUND') {
        throw new HttpErrors.NotFound(
          `User ${id} not found in ${role} collection`,
        );
      }
      throw e;
    }
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @patch('/user/admin/activate/{id}')
  @response(204, {description: 'User account activated'})
  async activateUser(
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      description: 'User role',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['role'],
            properties: {
              role: {
                type: 'string',
                enum: [FsaeRole.ALUMNI, FsaeRole.MEMBER, FsaeRole.SPONSOR],
              },
            },
          },
        },
      },
    })
    body: {role: FsaeRole},
  ): Promise<void> {
    const {role} = body;

    const repo =
      role === FsaeRole.ALUMNI
        ? this.alumniRepository
        : role === FsaeRole.MEMBER
          ? this.memberRepository
          : role === FsaeRole.SPONSOR
            ? this.sponsorRepository
            : undefined;

    if (!repo) throw new HttpErrors.BadRequest(`Unsupported role "${role}"`);

    try {
      await repo.updateById(id, {activated: true} as any);
      const thisUser = await repo.findById(id);
      await this.adminLogService.createAdminLog(
        this.currentUser[securityId] as string,
        {
          message: `Account ${(thisUser as any).email} activated`,
          accountEmail: (thisUser as any).email,
          accountRole: role.toLowerCase(),
          accountUserId: id,
        },
      );
    } catch (e: any) {
      if (e.code === 'ENTITY_NOT_FOUND') {
        throw new HttpErrors.NotFound(
          `User ${id} not found in ${role} collection`,
        );
      }
      throw e;
    }
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @post('/user/admin')
  @response(201, {
    description: 'Admin account created successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            email: {type: 'string'},
            message: {type: 'string'},
          },
        },
      },
    },
  })
  async createAdmin(
    @requestBody({
      required: true,
      description: 'Admin account details',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'email',
              'firstName',
              'lastName',
              'phoneNumber',
              'password',
            ],
            properties: {
              email: {type: 'string', format: 'email'},
              firstName: {type: 'string'},
              lastName: {type: 'string'},
              phoneNumber: {type: 'string'},
              password: {type: 'string'},
            },
          },
        },
      },
    })
    adminData: {
      email: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      password: string;
    },
  ): Promise<{id: string; email: string; message: string}> {
    const {email, firstName, lastName, phoneNumber, password} = adminData;
    const existingUser = await this.adminRepository.findOne({where: {email}});
    if (existingUser)
      throw new HttpErrors.Conflict(`Admin with email ${email} already exists`);

    try {
      const passwordHasherService = await this.app.get<PasswordHasherService>(
        'services.PasswordHasherService',
      );
      const hashedPassword = await passwordHasherService.hashPassword(password);
      const newAdmin = await this.adminRepository.create({
        email,
        firstName,
        lastName,
        phoneNumber,
        password: hashedPassword,
        role: FsaeRole.ADMIN,
        adminStatus: AdminStatus.APPROVED,
        activated: true,
        verified: true,
        createdAt: new Date(),
      } as unknown as Admin);

      await this.adminLogService.createAdminLog(
        this.currentUser[securityId] as string,
        {
          message: `Admin account ${newAdmin.email.toString()} created`,
          newAdminName: `${newAdmin.firstName} ${newAdmin.lastName}`,
          newAdminEmail: newAdmin.email.toString(),
          newAdminUserId: newAdmin.id!.toString(),
        },
      );

      return {
        id: newAdmin.id!.toString(),
        email: newAdmin.email,
        message: 'Admin account created successfully',
      };
    } catch (error: any) {
      throw new HttpErrors.InternalServerError(
        `Failed to create admin account: ${error.message}`,
      );
    }
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @del('/user/admin/{id}')
  @response(204, {description: 'Admin account deleted successfully'})
  async deleteAdmin(
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      description: 'Deletion reason',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['reason'],
            properties: {reason: {type: 'string'}},
          },
        },
      },
    })
    body: {reason: string},
  ): Promise<void> {
    const {reason} = body;
    if (id === this.currentUser[securityId])
      throw new HttpErrors.BadRequest('Cannot delete your own admin account');

    const totalAdmins = await this.adminRepository.count({
      adminStatus: AdminStatus.APPROVED,
      activated: true,
    } as any);
    if (totalAdmins.count <= 1)
      throw new HttpErrors.BadRequest(
        'Cannot delete the last remaining admin account',
      );

    try {
      const user = await this.adminRepository.findById(id);
      await this.adminRepository.deleteById(id);
      await this.adminLogService.createAdminLog(
        this.currentUser[securityId] as string,
        {
          message: `Admin account ${user.email.toString()} deleted`,
          reason,
          deletedAdminName: `${user.firstName} ${user.lastName}`,
          deletedAdminEmail: user.email.toString(),
          deletedAdminUserId: id,
        },
      );
    } catch (e: any) {
      if (e.code === 'ENTITY_NOT_FOUND')
        throw new HttpErrors.NotFound(`Admin ${id} not found`);
      throw e;
    }
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @get('/user/admin/list')
  @response(200, {
    description: 'Array of all admin accounts',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {type: 'string'},
              email: {type: 'string', format: 'email'},
              firstName: {type: 'string'},
              lastName: {type: 'string'},
              phoneNumber: {type: 'string'},
              activated: {type: 'boolean'},
              adminStatus: {type: 'string'},
              createdAt: {type: 'string', format: 'date-time'},
            },
          },
        },
      },
    },
  })
  async getAllAdmins(): Promise<Partial<Admin>[]> {
    const admins = await this.adminRepository.find({
      fields: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        activated: true,
        adminStatus: true,
        createdAt: true,
      },
    });
    return admins.map(a => ({
      id: a.id?.toString(),
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      phoneNumber: a.phoneNumber,
      activated: a.activated,
      adminStatus: a.adminStatus,
      createdAt: a.createdAt,
    }));
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @post('/user/admin/notify/{id}')
  @response(204, {description: 'Notification sent'})
  async notifyUser(
    @param.path.string('id') id: string,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'userType', 'type'],
            properties: {
              title: {type: 'string', minLength: 1},
              msgBody: {type: 'string', minLength: 1},
              userType: {
                type: 'string',
                enum: [
                  FsaeRole.ADMIN,
                  FsaeRole.ALUMNI,
                  FsaeRole.MEMBER,
                  FsaeRole.SPONSOR,
                ],
              },
              type: {
                type: 'string',
                enum: [
                  NotificationType.ANNOUNCEMENT,
                  NotificationType.NOTIFICATION,
                ],
              },
            },
          },
        },
      },
    })
    body: {
      title: string;
      msgBody?: string;
      userType: FsaeRole;
      type: NotificationType;
    },
  ): Promise<void> {
    const {title, msgBody, userType} = body;
    const CAP = 50;

    const userRepository =
      userType === FsaeRole.ALUMNI
        ? this.alumniRepository
        : userType === FsaeRole.MEMBER
          ? this.memberRepository
          : userType === FsaeRole.SPONSOR
            ? this.sponsorRepository
            : this.adminRepository;

    const user = await userRepository.findById(id);
    (user as any).notifications = (user as any).notifications ?? [];

    const notificationData: Partial<Notification> = {
      id: randomUUID(),
      issuer: this.currentUser[securityId] as string,
      title,
      type: NotificationType.NOTIFICATION,
      read: false,
      createdAt: new Date(),
    };

    if (msgBody && msgBody.toString().trim().length > 0)
      notificationData.msgBody = msgBody;

    const notification: Notification = new Notification(notificationData);

    await (userRepository as any).updateById(id, {
      $push: {
        notifications: {
          $each: [notification],
          $sort: {createdAt: -1},
          $slice: CAP,
        },
      },
    });
  }

  @authenticate('fsae-jwt')
  @authorize({allowedRoles: [FsaeRole.ADMIN]})
  @post('/user/admin/announce')
  @response(200, {description: 'Announcement broadcasted successfully'})
  async announce(
    @inject(SecurityBindings.USER) currentUser: UserProfile,
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['title', 'userTypes'],
            properties: {
              title: {type: 'string', minLength: 1},
              msgBody: {type: 'string'},
              userTypes: {
                type: 'array',
                items: {type: 'string', enum: Object.values(FsaeRole)},
                minItems: 1,
              },
            },
          },
        },
      },
    })
    body: {title: string; msgBody?: string; userTypes: FsaeRole[]},
  ): Promise<void> {
    const {title, msgBody, userTypes} = body;
    if (!Array.isArray(userTypes) || userTypes.length === 0) {
      throw new HttpErrors.BadRequest(
        'userTypes must be a non-empty array of roles',
      );
    }

    const announcementData: Partial<Notification> = {
      issuer: currentUser[securityId] as string,
      title,
      type: NotificationType.ANNOUNCEMENT,
      read: false,
      userRole: userTypes,
      createdAt: new Date(),
    };

    if (msgBody && msgBody.trim().length > 0)
      announcementData.msgBody = msgBody.trim();

    await this.announcementRepository.create(
      new Notification(announcementData),
    );
  }
}
