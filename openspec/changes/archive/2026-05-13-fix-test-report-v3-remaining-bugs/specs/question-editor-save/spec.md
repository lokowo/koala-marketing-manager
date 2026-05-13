## ADDED Requirements

### Requirement: Question changes are tracked in parent state in real-time
The QuestionEditor component SHALL report changes to the parent component via an `onChange` callback whenever the user edits any field (title, type, options, required, config). The parent component MUST maintain an up-to-date questions array reflecting all edits, including those from questions that have not been individually "saved."

#### Scenario: User edits a question title without clicking per-question save
- **WHEN** a user expands a question, changes the title, but does not click the per-question "保存"
- **THEN** the parent component's questions state reflects the updated title

#### Scenario: User changes question type
- **WHEN** a user changes a question's type from "单选" to "多选"
- **THEN** the parent state immediately reflects the new type

### Requirement: Add question updates state and UI immediately
The system SHALL, when a user clicks "增加问题", immediately add a new question to the parent questions state, render it in the list in expanded/editing mode, and scroll to it.

#### Scenario: User adds a new question
- **WHEN** a user clicks the "增加问题" button
- **THEN** a new empty question appears at the end of the list in expanded editing mode, and the page scrolls to show it

### Requirement: Delete question updates state and UI immediately
The system SHALL, when a user confirms deletion of a question, immediately remove it from the parent questions state and re-render the list without the deleted question.

#### Scenario: User deletes a question
- **WHEN** a user clicks "删除" on a question and confirms the deletion dialog
- **THEN** the question is removed from the list, question numbering updates, and the change is reflected in the parent state

### Requirement: Top-level save button persists all question changes
The top-level "保存" button MUST collect the current state of all questions (including unsaved per-question edits) and persist them to the server in a single API call.

#### Scenario: User edits multiple questions and clicks top-level save
- **WHEN** a user edits questions 2 and 5 (without per-question save), deletes question 3, adds a new question 6, then clicks the top-level "保存" button
- **THEN** the server receives and persists all changes: updated questions 2 and 5, removal of question 3, addition of question 6
- **AND** a success toast "已保存" appears
