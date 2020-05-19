import React from 'react';
import {RouteComponentProps} from 'react-router/lib/Router';
import pick from 'lodash/pick';
import styled from '@emotion/styled';

import {t} from 'sentry/locale';
import {
  Organization,
  Release,
  ReleaseProject,
  ReleaseMeta,
  Deploy,
  GlobalSelection,
} from 'sentry/types';
import AsyncView from 'sentry/views/asyncView';
import GlobalSelectionHeader from 'sentry/components/organizations/globalSelectionHeader';
import LightWeightNoProjectMessage from 'sentry/components/lightWeightNoProjectMessage';
import {PageContent} from 'sentry/styles/organization';
import withOrganization from 'sentry/utils/withOrganization';
import routeTitleGen from 'sentry/utils/routeTitle';
import {URL_PARAM} from 'sentry/constants/globalSelectionHeader';
import {formatVersion} from 'sentry/utils/formatters';
import AsyncComponent from 'sentry/components/asyncComponent';
import withGlobalSelection from 'sentry/utils/withGlobalSelection';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import {IconInfo, IconWarning} from 'sentry/icons';
import space from 'sentry/styles/space';
import Alert from 'sentry/components/alert';

import ReleaseHeader from './releaseHeader';
import PickProjectToContinue from './pickProjectToContinue';

type ReleaseContext = {
  release: Release;
  project: ReleaseProject;
  deploys: Deploy[];
  releaseMeta: ReleaseMeta;
};
const ReleaseContext = React.createContext<ReleaseContext>({} as ReleaseContext);

type RouteParams = {
  orgId: string;
  release: string;
};

type Props = RouteComponentProps<RouteParams, {}> & {
  organization: Organization;
  selection: GlobalSelection;
  releaseMeta: ReleaseMeta;
};

type State = {
  release: Release;
  deploys: Deploy[];
} & AsyncView['state'];

class ReleasesV2Detail extends AsyncView<Props, State> {
  shouldReload = true;

  getTitle() {
    const {params, organization} = this.props;
    return routeTitleGen(
      t('Release %s', formatVersion(params.release)),
      organization.slug,
      false
    );
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      deploys: [],
    };
  }

  getEndpoints() {
    const {organization, location, params, releaseMeta} = this.props;

    const query = {
      ...pick(location.query, [...Object.values(URL_PARAM)]),
      health: 1,
    };

    const basePath = `/organizations/${organization.slug}/releases/${encodeURIComponent(
      params.release
    )}/`;

    const endpoints: ReturnType<AsyncView['getEndpoints']> = [
      ['release', basePath, {query}],
    ];

    if (releaseMeta.deployCount > 0) {
      endpoints.push(['deploys', `${basePath}deploys/`]);
    }

    return endpoints;
  }

  renderError(...args) {
    const possiblyWrongProject = Object.values(this.state.errors).find(
      e => e?.status === 404 || e?.status === 403
    );

    if (possiblyWrongProject) {
      return (
        <PageContent>
          <Alert type="error" icon={<IconWarning />}>
            {t('This release may not be in your selected project.')}
          </Alert>
        </PageContent>
      );
    }

    return super.renderError(...args);
  }

  renderLoading() {
    return (
      <PageContent>
        <LoadingIndicator />
      </PageContent>
    );
  }

  renderBody() {
    const {organization, location, selection, releaseMeta} = this.props;
    const {release, deploys, reloading} = this.state;
    const project = release?.projects.find(p => p.id === selection.projects[0]);

    if (!project || !release) {
      if (reloading) {
        return <LoadingIndicator />;
      }

      return null;
    }

    return (
      <LightWeightNoProjectMessage organization={organization}>
        <StyledPageContent>
          <ReleaseHeader
            location={location}
            orgId={organization.slug}
            release={release}
            project={project}
            releaseMeta={releaseMeta}
          />

          <ContentBox>
            <ReleaseContext.Provider value={{release, project, deploys, releaseMeta}}>
              {this.props.children}
            </ReleaseContext.Provider>
          </ContentBox>
        </StyledPageContent>
      </LightWeightNoProjectMessage>
    );
  }
}

class ReleasesV2DetailContainer extends AsyncComponent<Omit<Props, 'releaseMeta'>> {
  shouldReload = true;

  getEndpoints(): ReturnType<AsyncView['getEndpoints']> {
    const {organization, params} = this.props;
    // fetch projects this release belongs to
    return [
      [
        'releaseMeta',
        `/organizations/${organization.slug}/releases/${encodeURIComponent(
          params.release
        )}/meta/`,
      ],
    ];
  }

  renderError(...args) {
    const has404Errors = Object.values(this.state.errors).find(e => e?.status === 404);

    if (has404Errors) {
      // This catches a 404 coming from the release endpoint and displays a custom error message.
      return (
        <PageContent>
          <Alert type="error" icon={<IconWarning />}>
            {t('This release could not be found.')}
          </Alert>
        </PageContent>
      );
    }

    return super.renderError(...args);
  }

  isProjectMissingInUrl() {
    const projectId = this.props.location.query.project;

    return !projectId || typeof projectId !== 'string';
  }

  renderLoading() {
    return (
      <PageContent>
        <LoadingIndicator />
      </PageContent>
    );
  }

  renderProjectsFooterMessage() {
    return (
      <ProjectsFooterMessage>
        <IconInfo size="xs" /> {t('Only projects with this release are visible.')}
      </ProjectsFooterMessage>
    );
  }

  renderBody() {
    const {organization, params, router} = this.props;
    const {releaseMeta} = this.state;
    const {projects} = releaseMeta;

    if (this.isProjectMissingInUrl()) {
      return (
        <PickProjectToContinue
          orgSlug={organization.slug}
          version={params.release}
          router={router}
          projects={projects}
        />
      );
    }

    return (
      <GlobalSelectionHeader
        lockedMessageSubject={t('release')}
        shouldForceProject={projects.length === 1}
        forceProject={projects.length === 1 ? projects[0] : undefined}
        specificProjectSlugs={projects.map(p => p.slug)}
        disableMultipleProjectSelection
        showProjectSettingsLink
        projectsFooterMessage={this.renderProjectsFooterMessage()}
      >
        <ReleasesV2Detail {...this.props} releaseMeta={releaseMeta} />
      </GlobalSelectionHeader>
    );
  }
}

const StyledPageContent = styled(PageContent)`
  padding: 0;
`;

const ProjectsFooterMessage = styled('div')`
  display: grid;
  align-items: center;
  grid-template-columns: min-content 1fr;
  grid-gap: ${space(1)};
`;

const ContentBox = styled('div')`
  padding: ${space(4)};
  flex: 1;
  background-color: white;
`;

export {ReleasesV2DetailContainer, ReleaseContext};
export default withGlobalSelection(withOrganization(ReleasesV2DetailContainer));
