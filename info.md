## Database Schema for Instagram-like Application

### **Users Table**

| Field         | Type    | Nullable | Key | Description                  |
|---------------|---------|----------|-----|------------------------------|
| user_id       | INTEGER | NO       | PRI | Primary key for user records |
| username      | TEXT    | NO       | UNI | Unique username              |
| email         | TEXT    | NO       | UNI | Unique email address         |
| password_hash | TEXT    | NO       |     | Hashed password              |
| created_at    | TEXT    | YES      |     | Record creation time         |

### **Posts Table**

| Field      | Type    | Nullable | Key | Description                      |
|------------|---------|----------|-----|----------------------------------|
| post_id    | INTEGER | NO       | PRI | Primary key for posts            |
| user_id    | INTEGER | NO       | FOR | Foreign key to Users table       |
| caption    | TEXT    | YES      |     | Post caption                     |
| location   | TEXT    | YES      |     | Location of the post             |
| created_at | TEXT    | YES      |     | Record creation time             |

### **Images Table**

| Field         | Type    | Nullable | Key | Description                      |
|---------------|---------|----------|-----|----------------------------------|
| image_id      | INTEGER | NO       | PRI | Primary key for images           |
| post_id       | INTEGER | NO       | FOR | Foreign key to Posts table       |
| image_url     | TEXT    | NO       |     | URL of the image                 |
| thumbnail_url | TEXT    | YES      |     | URL of the thumbnail image       |

### **Comments Table**

| Field      | Type    | Nullable | Key | Description                      |
|------------|---------|----------|-----|----------------------------------|
| comment_id | INTEGER | NO       | PRI | Primary key for comments         |
| post_id    | INTEGER | NO       | FOR | Foreign key to Posts table       |
| user_id    | INTEGER | NO       | FOR | Foreign key to Users table       |
| text       | TEXT    | NO       |     | Comment text                     |
| created_at | TEXT    | YES      |     | Record creation time             |

### **Likes Table**

| Field      | Type    | Nullable | Key | Description                      |
|------------|---------|----------|-----|----------------------------------|
| like_id    | INTEGER | NO       | PRI | Primary key for likes            |
| post_id    | INTEGER | NO       | FOR | Foreign key to Posts table       |
| user_id    | INTEGER | NO       | FOR | Foreign key to Users table       |
| created_at | TEXT    | YES      |     | Time when the like was recorded  |

### Relationships

- **Users** to **Posts**: One-to-Many (A user can have multiple posts)
- **Posts** to **Images**: One-to-Many (A post can have multiple images)
- **Posts** to **Comments**: One-to-Many (A post can have multiple comments)
- **Users** to **Comments**: One-to-Many (A user can make multiple comments)
- **Posts** to **Likes**: One-to-Many (A post can have multiple likes)
- **Users** to **Likes**: One-to-Many (A user can like multiple posts)
