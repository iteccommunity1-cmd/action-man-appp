An overview of the application you are currently working on, focusing on its architecture, key features, and the technologies used.

This application is a modern, full-stack project management and collaboration tool built using a robust set of technologies and following contemporary development best practices.

### Core Technology Stack

The application is built on the following foundation:

*   **Frontend:** **React** with **TypeScript** for type safety and maintainability.
*   **Styling:** **Tailwind CSS** is used extensively for utility-first styling, ensuring a responsive and customizable design. The UI components are sourced from the **shadcn/ui** library, which provides accessible and aesthetically pleasing building blocks.
*   **Routing:** **React Router** manages navigation, with all primary routes defined centrally in `src/App.tsx`.
*   **State Management & Data Fetching:** **React Query** (or TanStack Query) is utilized for managing server state, caching, synchronization, and handling asynchronous data operations efficiently.
*   **Backend & Database:** **Supabase** provides the backend services, including authentication, a PostgreSQL database, and Edge Functions for serverless logic (like sending push notifications).

### Analytics & Performance Insights

*   **Analytics Page (`src/pages/Analytics.tsx`):** Provides visual data representation using **Recharts**.
    *   **Task Velocity:** Tracks completed tasks over time.
    *   **Status Distribution:** Breakdown of tasks by current status.
    *   **Team Throughput:** Measures performance across assigned members.
    *   **Project Progress:** Visualizes completion percentages across all projects.
*   **PDF Export:** Integrated **jsPDF** and **jspdf-autotable** to allow users to download professional, branded PDF reports of their analytics data.

#### 1. User Management and Authentication

*   **Authentication:** Handled by Supabase Auth, integrated via the `SupabaseProvider` and `UserProvider` contexts. Supports ephemeral (Session Storage) and persisted sessions.
*   **BigSam Security Policy:** Includes a 15-minute inactivity timeout for automatic session protection.
*   **Protected Routes:** The `ProtectedRoute` component ensures that users must be authenticated to access the main application pages.
*   **User Context:** The `useUser` hook provides global access to the current user's profile and authentication status.

#### 2. Project Management

*   **Projects Page (`src/pages/Projects.tsx`):** Allows users to view, filter, sort, create, edit, and delete projects using the `ProjectList` component.
*   **Project Details (`src/pages/ProjectDetails.tsx`):** A dedicated page for managing all aspects of a single project.
    *   **Project Header (`ProjectHeader`):** Displays key project information, status, assigned members, and quick action buttons (Edit, Log Time, Go to Chat).
    *   **Overview Stats (`ProjectOverviewStats`):** Provides a summary of tasks, milestones, goals, metrics, files, and time logged.
    *   **Tabbed Interface (`ProjectDetailsTabs`):** Organizes project data into distinct sections:
        *   **Tasks:** Managed via `TaskList` and `TaskFormDialog`. Tasks include priority levels and assignment features.
        *   **Milestones, Goals, Metrics:** Dedicated lists and forms (`MilestoneList`, `GoalList`, `MetricList`) for tracking strategic project elements.
        *   **Files:** Managed via `ProjectFilesList`, allowing file uploads, downloads, and deletion using Supabase Storage.
        *   **Time:** Managed via `TimeEntryList` and `TimeEntryFormDialog`, allowing users to log time spent on the project or specific tasks.

#### 3. Collaboration and Communication

*   **Chat (`src/pages/Chat.tsx`):** Features real-time messaging using Supabase Realtime.
    *   **`ChatLayout`:** Manages the overall chat interface, handling mobile responsiveness (switching between room list and chat window).
    *   **`ChatRoomList`:** Displays available chat rooms (private and project-based).
    *   **`ChatWindow`:** Handles message display, sending, and includes a **Typing Indicator** feature using Supabase Broadcast.
    *   **Project Integration:** New projects automatically create an associated chat room, and project updates synchronize chat room membership.

#### 4. Notifications System

*   **In-App Notifications:** Managed via the `useNotifications` hook, fetching and displaying notifications in real-time using Supabase Realtime.
*   **Notification Bell (`NotificationBell`):** A component in the header showing the unread count and a quick view of recent notifications.
*   **Notifications Page (`src/pages/Notifications.tsx`):** A dedicated page for viewing and managing all notifications.
*   **Push Notifications:** The application is configured to support Web Push Notifications:
    *   **Service Worker (`public/service-worker.js`):** Handles receiving and displaying push messages in the browser.
    *   **Edge Function (`supabase/functions/send-push-notification/index.ts`):** A serverless function responsible for sending push notifications using the `web-push` library and VAPID keys.
        > [!IMPORTANT]
        > To enable push notifications, you must set the following secrets in your Supabase project using the CLI or Dashboard:
        > - `VAPID_PUBLIC_KEY`: BIXck_9XhyqzR4sVVyxDmbE1m-_ydJq2_TrGlJ3x0sVx_cv0hAEGP4_gcBq9zjfuwq-lxL5C0iAixytk1Nx5jhs
        > - `VAPID_PRIVATE_KEY`: fBPrPYGXE2yZAtgJ0xJLh1paAdKQ6-EiMplgpiGu9lo
        > - `VAPID_SUBJECT`: mailto:sam@actionman.app
    *   **`usePushNotifications` Hook:** Manages subscription status, permission requests, and saving/deleting subscription details in the Supabase database.
    *   **`sendNotification` Utility:** A centralized function that handles both inserting the notification into the database (for in-app display) and invoking the Edge Function (for push delivery).

#### 5. Dashboard and Daily Digest

*   **Dashboard (`src/pages/Index.tsx`):** Provides a high-level overview using the `DashboardOverview` component.
    *   Includes a dynamic `WelcomeCard` based on the time of day.
    *   Displays key performance indicators (KPIs) like total projects and overdue tasks.
    *   Features a `ProjectStatusChart` (Pie Chart) and a `ProjectTaskCalendar` to visualize deadlines and events.
    *   Shows an `UpcomingTasksWidget` for quick access to immediate priorities.
*   **Daily Digest (`src/pages/DailyDigest.tsx`):** Focuses on the user's personal tasks (`DailyDigestTaskList`), allowing them to manage status and priority efficiently.

In summary, the application is designed to be a comprehensive, real-time collaboration platform, leveraging modern React patterns and Supabase features to deliver a rich user experience.
