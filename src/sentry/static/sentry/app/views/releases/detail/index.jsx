import PropTypes from 'prop-types';
import React from 'react';
import pick from 'lodash/pick';

import {PageContent} from 'sentry/styles/organization';
import {URL_PARAM} from 'sentry/constants/globalSelectionHeader';
import {tn} from 'sentry/locale';
import Alert from 'sentry/components/alert';
import AsyncView from 'sentry/views/asyncView';
import GlobalSelectionHeader from 'sentry/components/organizations/globalSelectionHeader';
import LoadingError from 'sentry/components/loadingError';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import SentryTypes from 'sentry/sentryTypes';
import withGlobalSelection from 'sentry/utils/withGlobalSelection';
import withOrganization from 'sentry/utils/withOrganization';
import withProfiler from 'sentry/utils/withProfiler';
import withProjects from 'sentry/utils/withProjects';
import Feature from 'sentry/components/acl/feature';
import SwitchReleasesButton from 'sentry/views/releasesV2/utils/switchReleasesButton';

import ReleaseHeader from './releaseHeader';

const ReleaseDetailsContainer = props => (
  <React.Fragment>
    <GlobalSelectionHeader>
      <OrganizationReleaseDetails {...props} />
    </GlobalSelectionHeader>
  </React.Fragment>
);

class OrganizationReleaseDetails extends AsyncView {
  static propTypes = {
    organization: SentryTypes.Organization,
    project: SentryTypes.Project,
    /**
     * Currently selected values(s)
     */
    selection: SentryTypes.GlobalSelection,
    /**
     * List of projects to display in project selector
     */
    projects: PropTypes.arrayOf(SentryTypes.Project).isRequired,
  };

  static childContextTypes = {
    release: PropTypes.object,
  };

  getChildContext() {
    return {
      release: this.state.release,
    };
  }

  getTitle() {
    const {
      params: {release},
      organization,
    } = this.props;
    return `Release ${release} | ${organization.slug}`;
  }

  getEndpoints() {
    const {orgId, release} = this.props.params;
    const {project} = this.props.location.query;
    const query = {};
    if (project !== undefined) {
      query.project = project;
    }
    return [
      [
        'release',
        `/organizations/${orgId}/releases/${encodeURIComponent(release)}/`,
        {query},
      ],
    ];
  }

  renderError(error, disableLog = false, disableReport = false) {
    const has404Errors = Object.values(this.state.errors).find(
      resp => resp && resp.status === 404
    );
    if (has404Errors) {
      // This catches a 404 coming from the release endpoint and displays a custom error message.
      const {projects: allProjects} = this.props;
      const {projects: projectsFromSelection} = this.props.selection;

      // It's possible that `allProjects` is not fully loaded yet
      const selectedProjects = projectsFromSelection
        .map(selectedProjectId =>
          allProjects.find(({id}) => parseInt(id, 10) === selectedProjectId)
        )
        .filter(Boolean);

      return (
        <PageContent>
          <Alert type="error" icon="icon-circle-exclamation">
            {tn(
              'This release may not be in your selected project',
              'This release may not be in your selected projects',
              projectsFromSelection.length
            )}
            {selectedProjects.length
              ? `: ${selectedProjects.map(({slug}) => slug).join(', ')}`
              : ''}
          </Alert>
        </PageContent>
      );
    }
    return super.renderError(error, disableLog, disableReport);
  }

  renderBody() {
    const {
      location,
      params: {orgId},
      organization,
    } = this.props;
    const {release} = this.state;

    const query = pick(location.query, Object.values(URL_PARAM));

    if (this.state.loading) {
      return <LoadingIndicator />;
    }
    if (this.state.error) {
      return <LoadingError onRetry={this.fetchData} />;
    }

    return (
      <PageContent>
        <ReleaseHeader release={release} orgId={orgId} />
        {React.cloneElement(this.props.children, {
          release,
          query,
        })}
        <Feature features={['releases-v2']} organization={organization}>
          <SwitchReleasesButton version="2" orgId={organization.id} />
        </Feature>
      </PageContent>
    );
  }
}

export default withProjects(
  withOrganization(withGlobalSelection(withProfiler(ReleaseDetailsContainer)))
);
