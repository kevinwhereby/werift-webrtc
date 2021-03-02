import { Connection, Candidate } from "../../../ice/src";
import { DtlsServer, DtlsClient } from "../../src";
import { createIceTransport } from "../../examples/transport/ice";
import { certPem, keyPem } from "../fixture";

test("e2e/ice", async (done) => {
  const offer = new Connection(true, {
    stunServer: ["stun.l.google.com", 19302],
  });
  const answer = new Connection(false, {
    stunServer: ["stun.l.google.com", 19302],
  });
  await offer.gatherCandidates();
  answer.remoteCandidates = offer.localCandidates
    .map((v) => v.toSdp())
    .map((v) => Candidate.fromSdp(v));
  answer.remoteUsername = offer.localUserName;
  answer.remotePassword = offer.localPassword;
  await answer.gatherCandidates();
  offer.remoteCandidates = answer.localCandidates
    .map((v) => v.toSdp())
    .map((v) => Candidate.fromSdp(v));
  offer.remoteUsername = answer.localUserName;
  offer.remotePassword = answer.localPassword;

  await Promise.all([offer.connect(), answer.connect()]);

  const dtlsServer = new DtlsServer({
    transport: createIceTransport(offer),
    cert: certPem,
    key: keyPem,
  });
  dtlsServer.onConnect.subscribe(() => {
    dtlsServer.send(Buffer.from("dtls_over_ice"));
  });
  const dtlsClient = new DtlsClient({
    transport: createIceTransport(answer),
    key: keyPem,
    cert: certPem,
  });
  dtlsClient.onData.subscribe((buf) => {
    expect(buf.toString()).toBe("dtls_over_ice");
    done();
  });
  dtlsClient.connect();
}, 10_000);
