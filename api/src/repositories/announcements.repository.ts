import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {Notification} from '../models/notification.model';
import {MongoDbDataSource} from '../datasources';

export class AnnouncementRepository extends DefaultCrudRepository<
  Notification,
  typeof Notification.prototype.id
> {
  constructor(@inject('datasources.mongoDB') dataSource: MongoDbDataSource) {
    super(Notification, dataSource);
  }
}
