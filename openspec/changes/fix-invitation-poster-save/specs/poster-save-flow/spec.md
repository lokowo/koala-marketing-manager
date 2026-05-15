## ADDED Requirements

### Requirement: Mobile save shows inline image for long-press
On mobile devices, after html2canvas generates the poster image, the system SHALL display the generated image inline within the modal and show a prompt instructing the user to long-press to save.

#### Scenario: Mobile user clicks save
- **WHEN** user is on a mobile device and clicks「保存海报」
- **THEN** the button shows loading state「生成中...」
- **THEN** html2canvas renders the poster to a PNG data URL
- **THEN** the modal replaces the poster DOM with an `<img>` element showing the generated image
- **THEN** the modal displays the text「长按图片保存到相册」

#### Scenario: Mobile user wants to go back to poster view
- **WHEN** the generated image is displayed and user clicks「重新生成」or closes the modal
- **THEN** the modal resets to the original poster view

### Requirement: Desktop save triggers automatic download
On desktop devices, after html2canvas generates the poster image, the system SHALL trigger an automatic file download.

#### Scenario: Desktop user clicks save
- **WHEN** user is on a desktop device and clicks「保存海报」
- **THEN** html2canvas renders the poster to a PNG data URL
- **THEN** the browser downloads the file as `koala-invite-{referralCode}.png`
- **THEN** a success toast「海报已保存」appears

#### Scenario: Desktop download fallback
- **WHEN** the `<a download>` mechanism fails silently on desktop
- **THEN** the system falls back to displaying the image inline (same as mobile behavior)

### Requirement: Error handling for html2canvas failure
The system SHALL handle html2canvas failures gracefully with a clear error message.

#### Scenario: html2canvas throws an error
- **WHEN** html2canvas fails to render the poster (SecurityError, timeout, etc.)
- **THEN** a toast displays「截图失败，请手动截屏或复制链接」
- **THEN** the poster remains in its original state (no blank/broken image shown)

### Requirement: Modal reset on close
The system SHALL reset all generated image state when the modal is closed.

#### Scenario: User closes modal after generating image
- **WHEN** the modal is open with a generated image displayed and user closes the modal
- **THEN** the `generatedImageUrl` state resets to null
- **THEN** re-opening the modal shows the original poster view
