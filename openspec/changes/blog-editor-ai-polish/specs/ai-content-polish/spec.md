## ADDED Requirements

### Requirement: AI polish with style, word count, and platform options

The system SHALL provide an AI content polishing feature that accepts the current article content and three configuration dimensions: language style, target word count, and target platform. The system SHALL return polished content that the admin can compare with the original before confirming replacement.

Language style options SHALL be:
- 新闻报道 (news reporting)
- 社交媒体 (social media / 小红书 style)
- 学术科普 (academic popular science)
- 轻松对话 (casual conversational)

Target word count options SHALL be:
- 500字 / 800字 / 1200字 / 2000字 / 不限

Target platform options SHALL be:
- 微信公众号 / 小红书 / 博客网站 / LinkedIn

#### Scenario: Admin polishes article with specific style
- **WHEN** admin clicks "AI 润色" button and selects style "社交媒体", word count "800字", platform "小红书"
- **THEN** the system SHALL send the current content with these parameters to the AI polish API and return polished content in the selected style

#### Scenario: Polish request with content exceeding 5000 characters
- **WHEN** the article content exceeds 5000 characters
- **THEN** the system SHALL truncate to 5000 characters for AI processing and display a hint "内容较长，建议分段润色"

#### Scenario: Polish API failure
- **WHEN** the AI polish API call fails
- **THEN** the system SHALL display an error message and keep the original content unchanged

### Requirement: Side-by-side comparison of original and polished content

The system SHALL display the original content and polished content side-by-side in a modal dialog after AI polishing completes. The admin MUST explicitly confirm before the polished content replaces the original.

#### Scenario: Admin confirms polished content
- **WHEN** admin reviews the side-by-side comparison and clicks "确认替换"
- **THEN** the system SHALL replace the current content field (content_zh or content_en based on active tab) with the polished content and close the modal

#### Scenario: Admin rejects polished content
- **WHEN** admin clicks "取消" or closes the modal
- **THEN** the original content SHALL remain unchanged

#### Scenario: Admin retries with different settings
- **WHEN** admin is viewing the comparison and clicks "重新润色"
- **THEN** the system SHALL allow changing style/word count/platform and re-run the polish

### Requirement: Cover image local file upload

The system SHALL allow admin to upload a local image file as the blog cover image. The uploaded file SHALL be stored in Supabase Storage and the resulting public URL SHALL be set as the cover_image_url.

#### Scenario: Successful file upload
- **WHEN** admin selects a local image file (JPEG, PNG, WebP) under 5MB
- **THEN** the system SHALL upload it to Supabase Storage `blog-images` bucket and display the uploaded image as cover

#### Scenario: File exceeds size limit
- **WHEN** admin selects a file larger than 5MB
- **THEN** the system SHALL reject the upload and display "文件不能超过 5MB"

#### Scenario: Invalid file type
- **WHEN** admin selects a non-image file
- **THEN** the system SHALL reject the upload and display "只支持 JPG、PNG、WebP 格式"
