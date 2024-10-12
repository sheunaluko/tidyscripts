/**
 * FHIR Server
 *
 * A minimal FHIR server 
 */

import express, { Request, Response } from 'express';
import { Server } from 'http';


export class FHIRServer {
  private app = express();
  private data: any;
  private server: Server | undefined;

  constructor(data: any) {
    this.data = data;
    this.setupRoutes();
  }

  private setupRoutes() {
    // Middleware to parse JSON
    this.app.use(express.json());

    // Read a Patient resource by ID
    this.app.get('/Patient/:id', (req: Request, res: Response) => {
      const id = req.params.id;
      const patient = this.data.Patient.find((p: any) => p.id === id);
      if (patient) {
        res.json(patient);
      } else {
        res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'not-found',
              diagnostics: 'Patient not found',
            },
          ],
        });
      }
    });

    // Generic search endpoint for resources
    this.app.get('/:resourceType', (req: Request, res: Response) => {
      const resourceType = req.params.resourceType;
      const patientId = req.query.patient;
      let resources = this.data[resourceType];
      if (!resources) {
        res.status(404).json({
          resourceType: 'OperationOutcome',
          issue: [
            {
              severity: 'error',
              code: 'not-found',
              diagnostics: 'Resource type not found',
            },
          ],
        });
        return;
      }
      if (patientId) {
        resources = resources.filter(
          (r: any) =>
            r.subject?.reference === `Patient/${patientId}` ||
            r.patient?.reference === `Patient/${patientId}`
        );
      }
      res.json({
        resourceType: 'Bundle',
        type: 'searchset',
        entry: resources.map((r: any) => ({ resource: r })),
      });
    });
  }

  public start(port: number) {
    this.server = this.app.listen(port, () => {
      console.log(`FHIR Server is running at http://localhost:${port}`);
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
    }
  }
}
