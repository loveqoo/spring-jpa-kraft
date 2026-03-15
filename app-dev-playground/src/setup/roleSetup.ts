import { Either as E } from 'effect'
import { initRoleHandler, defaultHasRole } from 'lib-entity-support'
import type { UserInfo } from 'lib-entity-support'

const devUser: UserInfo = {
  userId: 'dev',
  userName: 'Developer',
  roles: ['ADMIN'],
}

export const setupRole = () => {
  initRoleHandler({
    userInfo: () => E.right(devUser),
    hasRole: defaultHasRole,
  })
}
