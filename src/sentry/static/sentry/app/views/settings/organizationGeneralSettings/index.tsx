import {RouteComponentProps} from 'react-router/lib/Router';
import {browserHistory} from 'react-router';
import React from 'react';

import {Client} from 'sentry/api';
import {Organization} from 'sentry/types';
import {Panel, PanelHeader} from 'sentry/components/panels';
import {addLoadingMessage} from 'sentry/actionCreators/indicator';
import {
  changeOrganizationSlug,
  removeAndRedirectToRemainingOrganization,
  updateOrganization,
} from 'sentry/actionCreators/organizations';
import {t, tct} from 'sentry/locale';
import Field from 'sentry/views/settings/components/forms/field';
import Hook from 'sentry/components/hook';
import LinkWithConfirmation from 'sentry/components/links/linkWithConfirmation';
import PermissionAlert from 'sentry/views/settings/organization/permissionAlert';
import SentryDocumentTitle from 'sentry/components/sentryDocumentTitle';
import SettingsPageHeader from 'sentry/views/settings/components/settingsPageHeader';
import TextBlock from 'sentry/views/settings/components/text/textBlock';
import withApi from 'sentry/utils/withApi';
import withOrganization from 'sentry/utils/withOrganization';

import OrganizationSettingsForm from './organizationSettingsForm';

type Props = {
  api: Client;
  organization: Organization;
} & RouteComponentProps<{orgId: string}, {}>;

class OrganizationGeneralSettings extends React.Component<Props> {
  handleRemoveOrganization = () => {
    const {api, organization, params} = this.props;
    if (!organization) {
      return;
    }

    addLoadingMessage();
    removeAndRedirectToRemainingOrganization(api, {
      orgId: params.orgId,
      successMessage: `${organization.name} is queued for deletion.`,
      errorMessage: `Error removing the ${organization.name} organization`,
    });
  };

  handleSave = (prevData: Organization, data: Organization) => {
    if (data.slug && data.slug !== prevData.slug) {
      changeOrganizationSlug(prevData, data);
      browserHistory.replace(`/settings/${data.slug}/`);
    } else {
      // This will update OrganizationStore (as well as OrganizationsStore
      // which is slightly incorrect because it has summaries vs a detailed org)
      updateOrganization(data);
    }
  };

  render() {
    const {organization, params} = this.props;
    const {orgId} = params;
    const access = new Set(organization.access);
    const hasProjects = organization.projects && !!organization.projects.length;

    return (
      <React.Fragment>
        <SentryDocumentTitle title={t('General Settings')} objSlug={orgId} />
        <div>
          <SettingsPageHeader title={t('Organization Settings')} />
          <PermissionAlert />
          <Hook name="settings:organization-general-settings" />

          <OrganizationSettingsForm
            {...this.props}
            initialData={organization}
            orgId={orgId}
            access={access}
            onSave={this.handleSave}
          />

          {access.has('org:admin') && !organization.isDefault && (
            <Panel>
              <PanelHeader>{t('Remove Organization')}</PanelHeader>
              <Field
                label={t('Remove Organization')}
                help={t(
                  'Removing this organization will delete all data including projects and their associated events.'
                )}
              >
                <div>
                  <LinkWithConfirmation
                    className="btn btn-danger"
                    priority="danger"
                    title={t('Remove %s organization', organization && organization.name)}
                    message={
                      <div>
                        <TextBlock>
                          {tct(
                            'Removing the organization, [name] is permanent and cannot be undone! Are you sure you want to continue?',
                            {
                              name: organization && <strong>{organization.name}</strong>,
                            }
                          )}
                        </TextBlock>

                        {hasProjects && (
                          <div>
                            <TextBlock noMargin>
                              {t(
                                'This will also remove the following associated projects:'
                              )}
                            </TextBlock>
                            <ul className="ref-projects">
                              {organization.projects.map(project => (
                                <li key={project.slug}>{project.slug}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    }
                    onConfirm={this.handleRemoveOrganization}
                  >
                    {t('Remove Organization')}
                  </LinkWithConfirmation>
                </div>
              </Field>
            </Panel>
          )}
        </div>
      </React.Fragment>
    );
  }
}

export default withApi(withOrganization(OrganizationGeneralSettings));
