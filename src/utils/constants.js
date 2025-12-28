export const UserRolesEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member"
} // Here we are sending the whole object {ADMIN: "admin", PROJECT_ADMIN: "project_admin", MEMBER: "member"}

export const AvailableUserRole = Object.values(UserRolesEnum) // here we are sending just array which just contains the value ("admin", "project_admin", "member") in the array format. and also to loop through it.


export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done"
} // Here we are sending the whole object {ADMIN: "admin", PROJECT_ADMIN: "project_admin", MEMBER: "member"}

export const AvailableTaskStatuses = Object.values(TaskStatusEnum) // here we are sending just array which just contains the value ("admin", "project_admin", "member") in the array format. and also to loop through it.