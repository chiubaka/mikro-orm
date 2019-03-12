import { Utils } from '../utils';
import { ArrayCollection } from './ArrayCollection';
import { Collection } from './Collection';
import { EntityData, IEntity, IEntityType } from '../decorators';
import { MetadataStorage } from '../metadata';

export class EntityTransformer {

  static toObject<T extends IEntityType<T>>(entity: T, parent?: IEntity, isCollection = false): EntityData<T> {
    const ret = (entity.id ? { id: entity.id } : {}) as EntityData<T>;

    if (!entity.isInitialized() && entity.id) {
      return ret;
    }

    Object.keys(entity)
      .filter(prop => prop !== 'id' && !prop.startsWith('_'))
      .map(prop => [prop, EntityTransformer.processProperty<T>(prop as keyof T, entity, parent || entity, isCollection)])
      .filter(([prop, value]) => !!value)
      .forEach(([prop, value]) => ret[prop!] = value);

    return ret;
  }

  private static processProperty<T extends IEntityType<T>>(prop: keyof T, entity: T, parent: IEntity, isCollection: boolean): T[keyof T] | undefined {
    if (entity[prop] as object instanceof ArrayCollection) {
      return EntityTransformer.processCollection(prop, entity);
    }

    if (Utils.isEntity(entity[prop])) {
      return EntityTransformer.processEntity(prop, entity, parent, isCollection);
    }

    return entity[prop];
  }

  private static processEntity<T extends IEntityType<T>>(prop: keyof T, entity: T, parent: IEntity, isCollection: boolean): T[keyof T] | undefined {
    const child = entity[prop] as IEntity;

    if (child.isInitialized() && child.__populated && !isCollection && child !== parent) {
      const meta = MetadataStorage.getMetadata(child.constructor.name);
      const args = [...meta.toJsonParams.map(() => undefined), entity];

      return child.toJSON(...args) as T[keyof T];
    }

    return entity[prop].id;
  }

  private static processCollection<T extends IEntityType<T>>(prop: keyof T, entity: T): T[keyof T] | undefined {
    const col = entity[prop] as Collection<IEntity>;

    if (col.isInitialized(true) && col.shouldPopulate()) {
      return col.toArray(entity) as T[keyof T];
    }

    if (col.isInitialized()) {
      return col.getIdentifiers() as T[keyof T];
    }
  }

}
