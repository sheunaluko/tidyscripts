// fhir_client.ts

/**
 * FHIR Client Library
 *
 * A TypeScript FHIR client for interacting with a FHIR server
 * conforming to the US Core Client CapabilityStatement.
 *
 * Generated with the help of GPT-4 o1-preview on 2024-10-12.
 */

import axios, { AxiosInstance } from 'axios';

export class FHIRClient {
  private axios_instance: AxiosInstance;

  constructor(base_url: string) {
    const access_token = process.env.ACCESS_TOKEN;

    this.axios_instance = axios.create({
      baseURL: base_url,
      headers: {
        Accept: 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
        ...(access_token && { Authorization: `Bearer ${access_token}` }),
      },
    });
  }

  /** Read a resource by type and ID */
  async read<T>(resource_type: string, id: string): Promise<T> {
    const response = await this.axios_instance.get<T>(`/${resource_type}/${id}`);
    return response.data;
  }

  /** Search for resources with query parameters */
  async search<T>(
    resource_type: string,
    params: Record<string, string | number>
  ): Promise<T[]> {
    const response = await this.axios_instance.get(`/${resource_type}`, { params });
    return response.data.entry?.map((entry: any) => entry.resource) || [];
  }

  /** Create a new resource */
  async create<T>(resource_type: string, resource: T): Promise<T> {
    const response = await this.axios_instance.post<T>(`/${resource_type}`, resource);
    return response.data;
  }

  /** Update an existing resource by ID */
  async update<T>(resource_type: string, id: string, resource: T): Promise<T> {
    const response = await this.axios_instance.put<T>(
      `/${resource_type}/${id}`,
      resource
    );
    return response.data;
  }

  /** Delete a resource by type and ID */
  async delete(resource_type: string, id: string): Promise<void> {
    await this.axios_instance.delete(`/${resource_type}/${id}`);
  }

  /** Search patients by name */
  async search_patients_by_name(name: string): Promise<any[]> {
    return this.search('Patient', { name });
  }

  /** Search observations by patient ID and code */
  async search_observations_by_code(
    patient_id: string,
    code: string
  ): Promise<any[]> {
    return this.search('Observation', { patient: patient_id, code });
  }

  /** Get the CapabilityStatement of the FHIR server */
  async get_capability_statement(): Promise<any> {
    const response = await this.axios_instance.get('/metadata');
    return response.data;
  }

  /** Perform a batch operation */
  async batch(requests: any[]): Promise<any> {
    const response = await this.axios_instance.post('/', {
      resourceType: 'Bundle',
      type: 'batch',
      entry: requests,
    });
    return response.data;
  }

  /** Perform a transaction operation */
  async transaction(requests: any[]): Promise<any> {
    const response = await this.axios_instance.post('/', {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: requests,
    });
    return response.data;
  }

  /** Search with inclusion of related resources */
  async search_with_include<T>(
    resource_type: string,
    params: Record<string, string | number>,
    include: string
  ): Promise<T[]> {
    const response = await this.axios_instance.get(`/${resource_type}`, {
      params: { ...params, _include: include },
    });
    return response.data.entry?.map((entry: any) => entry.resource) || [];
  }

  /** Fetch resource history */
  async history<T>(resource_type: string, id: string): Promise<T[]> {
    const response = await this.axios_instance.get(
      `/${resource_type}/${id}/_history`
    );
    return response.data.entry?.map((entry: any) => entry.resource) || [];
  }

  /** Validate a resource against a profile */
  async validate<T>(resource_type: string, resource: T): Promise<any> {
    const response = await this.axios_instance.post(
      `/${resource_type}/$validate`,
      resource
    );
    return response.data;
  }

  /** Patch a resource using JSON Patch */
  async patch<T>(resource_type: string, id: string, patch_data: any): Promise<T> {
    const response = await this.axios_instance.patch<T>(
      `/${resource_type}/${id}`,
      patch_data,
      {
        headers: { 'Content-Type': 'application/json-patch+json' },
      }
    );
    return response.data;
  }

  /** Execute a custom operation */
  async operation(
    resource_type: string,
    operation_name: string,
    params: any
  ): Promise<any> {
    const response = await this.axios_instance.post(
      `/${resource_type}/$${operation_name}`,
      params
    );
    return response.data;
  }

  /** Search resources with pagination */
  async search_with_pagination<T>(
    resource_type: string,
    params: Record<string, string | number>,
    page_url?: string
  ): Promise<{ data: T[]; next_page_url?: string }> {
    const response = page_url
      ? await this.axios_instance.get(page_url)
      : await this.axios_instance.get(`/${resource_type}`, { params });
    const data = response.data.entry?.map((entry: any) => entry.resource) || [];
    const next_page_url = response.data.link?.find(
      (link: any) => link.relation === 'next'
    )?.url;
    return { data, next_page_url };
  }

  /** Fetch an observation and related diagnostic reports */
  async get_observation_with_reports(id: string): Promise<any> {
    const response = await this.axios_instance.get(`/Observation/${id}`, {
      params: { _revinclude: 'DiagnosticReport:result' },
    });
    return response.data;
  }

  /** Execute the $docref operation for a patient */
  async get_document_references(patient_id: string): Promise<any> {
    const response = await this.axios_instance.get(
      '/DocumentReference/$docref',
      {
        params: { patient: patient_id },
      }
    );
    return response.data;
  }

  /** Search encounters by patient and date */
  async search_encounters(patient_id: string, date: string): Promise<any[]> {
    return this.search('Encounter', { patient: patient_id, date });
  }

  /** Refresh OAuth2 access token */
  async refresh_token(refresh_token: string, client_id: string): Promise<void> {
    const response = await axios.post('/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
      client_id: client_id,
    });
    this.axios_instance.defaults.headers[
      'Authorization'
    ] = `Bearer ${response.data.access_token}`;
  }

  /** Read a binary resource (e.g., images, PDFs) */
  async read_binary(id: string): Promise<Blob> {
    const response = await this.axios_instance.get(`/Binary/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /** Retrieve the provenance of a resource */
  async get_provenance(
    resource_type: string,
    resource_id: string
  ): Promise<any[]> {
    return this.search('Provenance', {
      target: `${resource_type}/${resource_id}`,
    });
  }

  /** Expand a ValueSet using terminology services */
  async expand_value_set(url: string): Promise<any> {
    const response = await this.axios_instance.post('/ValueSet/$expand', { url });
    return response.data;
  }

  /** Search care plans by patient and category */
  async search_care_plans(
    patient_id: string,
    category: string
  ): Promise<any[]> {
    return this.search('CarePlan', { patient: patient_id, category });
  }

  /** Generic GET request for custom endpoints */
  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    const response = await this.axios_instance.get(url, { params });
    return response.data;
  }

  /** Generic POST request for custom operations */
  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.axios_instance.post(url, data);
    return response.data;
  }
}
