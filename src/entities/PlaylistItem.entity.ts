import {
  InsertEvent,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  EventSubscriber,
  EntitySubscriberInterface,
  UpdateEvent,
  SoftRemoveEvent,
} from "typeorm";
import { PlaylistItemType } from "types/playlist.types";
import { Dream } from "./Dream.entity";
import { Playlist } from "./Playlist.entity";

@Entity()
export class PlaylistItem {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Playlist which belongs the playlist item
   */
  @ManyToOne(() => Playlist)
  @JoinColumn()
  playlist: Playlist;

  @Column({
    type: "enum",
    enum: PlaylistItemType,
    default: PlaylistItemType.NONE,
  })
  type: PlaylistItemType;

  /**
   * Dream of the Playlist Item
   * Should be null if playlistItem exists
   */
  @ManyToOne(() => Dream, (dream) => dream.playlistItems)
  dreamItem: Dream;

  /**
   * Playlist of the Playlist Item
   * Should be null if dreamItem exists
   */
  @ManyToOne(() => Playlist, (playlist) => playlist.playlistItems)
  playlistItem: Playlist;

  @Column({ default: 0, type: "integer" })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}

/**
 * Subscriber for PlaylistItem
 * Automatically updates the associated Playlist's updated_at timestamp when a PlaylistItem is inserted, updated, or soft-removed
 */
@EventSubscriber()
export class PlaylistItemSubscriber
implements EntitySubscriberInterface<PlaylistItem>
{
  // constructor(dataSource: DataSource) {
  //   dataSource.subscribers.push(this);
  // }

  /**
   * Specifies that this subscriber listens to PlaylistItem events
   */
  listenTo() {
    return PlaylistItem;
  }

  /**
   * After insert event handler
   */
  async afterInsert(event: InsertEvent<PlaylistItem>) {
    await this.updatePlaylistTimestamp(event, event.entity.id);
  }

  /**
   * After update event handler
   */
  async afterUpdate(event: UpdateEvent<PlaylistItem>) {
    await this.updatePlaylistTimestamp(event, event.databaseEntity.id);
  }

  /**
   * After soft remove event handler
   */
  async afterSoftRemove(event: SoftRemoveEvent<PlaylistItem>) {
    await this.updatePlaylistTimestamp(event, event.entityId);
  }

  /**
   * Updates the timestamp of the associated Playlist
   */
  private async updatePlaylistTimestamp(
    event:
      | InsertEvent<PlaylistItem>
      | UpdateEvent<PlaylistItem>
      | SoftRemoveEvent<PlaylistItem>,
    playlistItemId: number,
  ): Promise<void> {
    const manager = event.manager;
    const playlistItemRepository = manager.getRepository(PlaylistItem);
    const playlistItem = await playlistItemRepository.findOne({
      where: { id: playlistItemId },
      relations: ["playlist"],
      withDeleted: true,
    });

    if (playlistItem && playlistItem.playlist) {
      const playlistRepository = manager.getRepository(Playlist);
      await playlistRepository.update(playlistItem.playlist.id, {
        updated_at: new Date(),
      });
    }
  }
}
