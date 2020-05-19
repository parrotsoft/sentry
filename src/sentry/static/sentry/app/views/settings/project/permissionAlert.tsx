import PropTypes from 'prop-types';
import React from 'react';

import {t} from 'sentry/locale';
import Access from 'sentry/components/acl/access';
import Alert from 'sentry/components/alert';

type Props = React.ComponentPropsWithoutRef<typeof Alert> &
  Pick<React.ComponentProps<typeof Access>, 'access'>;

const PermissionAlert = ({access = ['project:write'], ...props}: Props) => (
  <Access access={access}>
    {({hasAccess}) =>
      !hasAccess && (
        <Alert type="warning" icon="icon-warning-sm" {...props}>
          {t(
            'These settings can only be edited by users with the organization owner, manager, or admin role.'
          )}
        </Alert>
      )
    }
  </Access>
);

PermissionAlert.propTypes = {
  access: PropTypes.arrayOf(PropTypes.string),
};

export default PermissionAlert;
