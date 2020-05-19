import React from 'react';
import styled from '@emotion/styled';

import {Client} from 'sentry/api';
import {Environment, Organization} from 'sentry/types';
import {Panel, PanelBody, PanelHeader} from 'sentry/components/panels';
import {addErrorMessage} from 'sentry/actionCreators/indicator';
import {defined} from 'sentry/utils';
import {getDisplayName} from 'sentry/utils/environment';
import {t, tct} from 'sentry/locale';
import FormField from 'sentry/views/settings/components/forms/formField';
import SearchBar from 'sentry/views/events/searchBar';
import SelectField from 'sentry/views/settings/components/forms/selectField';
import space from 'sentry/styles/space';
import theme from 'sentry/utils/theme';
import Tooltip from 'sentry/components/tooltip';

import {AlertRuleAggregations, TimeWindow, IncidentRule} from './types';
import getMetricDisplayName from './utils/getMetricDisplayName';

type TimeWindowMapType = {[key in TimeWindow]: string};

const TIME_WINDOW_MAP: TimeWindowMapType = {
  [TimeWindow.ONE_MINUTE]: t('1 minute'),
  [TimeWindow.FIVE_MINUTES]: t('5 minutes'),
  [TimeWindow.TEN_MINUTES]: t('10 minutes'),
  [TimeWindow.FIFTEEN_MINUTES]: t('15 minutes'),
  [TimeWindow.THIRTY_MINUTES]: t('30 minutes'),
  [TimeWindow.ONE_HOUR]: t('1 hour'),
  [TimeWindow.TWO_HOURS]: t('2 hours'),
  [TimeWindow.FOUR_HOURS]: t('4 hours'),
  [TimeWindow.ONE_DAY]: t('24 hours'),
};

type Props = {
  api: Client;
  organization: Organization;
  projectSlug: string;
  disabled: boolean;
  thresholdChart: React.ReactNode;
  onFilterUpdate: (query: string) => void;
};

type State = {
  environments: Environment[] | null;
};

class RuleConditionsForm extends React.PureComponent<Props, State> {
  state: State = {
    environments: null,
  };

  componentDidMount() {
    this.fetchData();
  }

  async fetchData() {
    const {api, organization, projectSlug} = this.props;

    try {
      const environments = await api.requestPromise(
        `/projects/${organization.slug}/${projectSlug}/environments/`,
        {
          query: {
            visibility: 'visible',
          },
        }
      );
      this.setState({environments});
    } catch (_err) {
      addErrorMessage(t('Unable to fetch environments'));
    }
  }

  render() {
    const {organization, disabled, onFilterUpdate} = this.props;
    const {environments} = this.state;

    const environmentList: [IncidentRule['environment'], React.ReactNode][] = defined(
      environments
    )
      ? environments.map((env: Environment) => [env.name, getDisplayName(env)])
      : [];

    const anyEnvironmentLabel = (
      <React.Fragment>
        {t('All Environments')}
        <div className="all-environment-note">
          {tct(
            `This will count events across every environment. For example,
             having 50 [code1:production] events and 50 [code2:development]
             events would trigger an alert with a critical threshold of 100.`,
            {code1: <code />, code2: <code />}
          )}
        </div>
      </React.Fragment>
    );
    environmentList.unshift([null, anyEnvironmentLabel]);

    return (
      <Panel>
        <PanelHeader>{t('Configure Rule Conditions')}</PanelHeader>
        <PanelBody>
          {this.props.thresholdChart}
          <FormField name="query" inline={false}>
            {({onChange, onBlur, onKeyDown, initialData}) => (
              <SearchBar
                defaultQuery={initialData?.query ?? ''}
                inlineLabel={
                  <Tooltip
                    title={t('Metric alerts are filtered to error events automatically')}
                  >
                    <SearchEventTypeNote>event.type:error</SearchEventTypeNote>
                  </Tooltip>
                }
                help={t('Choose which metric to trigger on')}
                disabled={disabled}
                useFormWrapper={false}
                organization={organization}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onBlur={query => {
                  onFilterUpdate(query);
                  onBlur(query);
                }}
                onSearch={query => {
                  onFilterUpdate(query);
                  onChange(query, {});
                }}
              />
            )}
          </FormField>
          <SelectField
            name="aggregation"
            label={t('Metric')}
            help={t('Choose which metric to trigger on')}
            choices={[
              [
                AlertRuleAggregations.UNIQUE_USERS,
                getMetricDisplayName(AlertRuleAggregations.UNIQUE_USERS),
              ],
              [
                AlertRuleAggregations.TOTAL,
                getMetricDisplayName(AlertRuleAggregations.TOTAL),
              ],
            ]}
            required
            isDisabled={disabled}
          />
          <SelectField
            name="timeWindow"
            label={t('Time Window')}
            help={
              <React.Fragment>
                <div>{t('The time window to use when evaluating the Metric')}</div>
                <div>
                  {t(
                    'Note: Triggers are evaluated every minute regardless of this value.'
                  )}
                </div>
              </React.Fragment>
            }
            choices={Object.entries(TIME_WINDOW_MAP)}
            required
            isDisabled={disabled}
            getValue={value => Number(value)}
            setValue={value => `${value}`}
          />
          <SelectField
            name="environment"
            label={t('Environment')}
            placeholder={t('All Environments')}
            help={t('Choose which environment events must match')}
            styles={{
              singleValue: (base: any) => ({
                ...base,
                '.all-environment-note': {display: 'none'},
              }),
              option: (base: any, state: any) => ({
                ...base,
                '.all-environment-note': {
                  ...(!state.isSelected && !state.isFocused ? {color: theme.gray3} : {}),
                  fontSize: theme.fontSizeSmall,
                },
              }),
            }}
            choices={environmentList}
            isDisabled={disabled || this.state.environments === null}
            isClearable
          />
        </PanelBody>
      </Panel>
    );
  }
}

const SearchEventTypeNote = styled('div')`
  font: ${p => p.theme.fontSizeExtraSmall} ${p => p.theme.text.familyMono};
  color: ${p => p.theme.gray3};
  background: ${p => p.theme.offWhiteLight};
  border-radius: ${p => p.theme.borderRadius};
  padding: ${space(0.5)} ${space(0.75)};
  margin: 0 ${space(0.5)} 0 ${space(1)};
  user-select: none;
`;

export default RuleConditionsForm;
