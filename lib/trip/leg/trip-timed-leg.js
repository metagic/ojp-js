import { JourneyService } from '../../journey/journey-service';
import { StopPoint } from './timed-leg/stop-point';
import { LegTrack } from './leg-track';
import { TripLeg } from "./trip-leg";
import { TripLegPropertiesEnum } from "../../types/map-geometry-types";
import { MapLegLineTypeColor } from '../../config/map-colors';
export class TripTimedLeg extends TripLeg {
    constructor(legIDx, service, fromStopPoint, toStopPoint, intermediateStopPoints = []) {
        const legType = 'TimedLeg';
        super(legType, legIDx, fromStopPoint.location, toStopPoint.location);
        this.service = service;
        this.fromStopPoint = fromStopPoint;
        this.toStopPoint = toStopPoint;
        this.intermediateStopPoints = intermediateStopPoints;
    }
    static initWithTreeNode(legIDx, treeNode) {
        const service = JourneyService.initWithTreeNode(treeNode);
        if (service === null) {
            return null;
        }
        const fromStopTreeNode = treeNode.findChildNamed('LegBoard');
        const toStopTreeNode = treeNode.findChildNamed('LegAlight');
        if (fromStopTreeNode === null || toStopTreeNode === null) {
            return null;
        }
        const fromStopPoint = StopPoint.initWithTreeNode(fromStopTreeNode, 'From');
        const toStopPoint = StopPoint.initWithTreeNode(toStopTreeNode, 'To');
        if (fromStopPoint === null || toStopPoint === null) {
            return null;
        }
        const intermediateStopPoints = [];
        const intermediaryStopTreeNodes = treeNode.findChildrenNamed('LegIntermediate');
        intermediaryStopTreeNodes.forEach(intermediaryStopTreeNode => {
            const stopPoint = StopPoint.initWithTreeNode(intermediaryStopTreeNode, 'Intermediate');
            if (stopPoint) {
                intermediateStopPoints.push(stopPoint);
            }
        });
        const timedLeg = new TripTimedLeg(legIDx, service, fromStopPoint, toStopPoint, intermediateStopPoints);
        timedLeg.legTrack = LegTrack.initWithLegTreeNode(treeNode);
        if (timedLeg.legTrack && timedLeg.legDuration === null) {
            timedLeg.legDuration = timedLeg.legTrack.duration;
        }
        return timedLeg;
    }
    patchLocations(mapContextLocations) {
        super.patchLocations(mapContextLocations);
        this.intermediateStopPoints.forEach(stopPoint => {
            this.patchLocation(stopPoint.location, mapContextLocations);
        });
    }
    computeDepartureTime() {
        return this.computeStopPointTime(this.fromStopPoint.departureData);
    }
    computeArrivalTime() {
        return this.computeStopPointTime(this.toStopPoint.arrivalData);
    }
    computeStopPointTime(timeData) {
        var _a;
        if (timeData === null) {
            return null;
        }
        const stopPointDate = (_a = timeData.estimatedTime) !== null && _a !== void 0 ? _a : timeData.timetableTime;
        return stopPointDate;
    }
    computeSpecificJSONFeatures() {
        var _a;
        let features = [];
        const lineType = this.service.computeLegLineType();
        const useDetailedTrack = !this.useBeeline();
        if (useDetailedTrack) {
            (_a = this.legTrack) === null || _a === void 0 ? void 0 : _a.trackSections.forEach(trackSection => {
                var _a;
                const feature = (_a = trackSection.linkProjection) === null || _a === void 0 ? void 0 : _a.asGeoJSONFeature();
                if (feature === null || feature === void 0 ? void 0 : feature.properties) {
                    const drawType = 'LegLine';
                    feature.properties[TripLegPropertiesEnum.DrawType] = drawType;
                    feature.properties[TripLegPropertiesEnum.LineType] = lineType;
                    features.push(feature);
                }
            });
        }
        return features;
    }
    computeLegLineType() {
        return this.service.computeLegLineType();
    }
    computeLinePointsData() {
        const linePointsData = super.computeLinePointsData();
        // Intermediate points
        this.intermediateStopPoints.forEach(stopPoint => {
            const locationFeature = stopPoint.location.asGeoJSONFeature();
            if (locationFeature === null || locationFeature === void 0 ? void 0 : locationFeature.properties) {
                linePointsData.push({
                    type: 'Intermediate',
                    feature: locationFeature
                });
            }
        });
        return linePointsData;
    }
    computeLegColor() {
        var _a;
        const defaultColor = super.computeLegColor();
        const timedLegLineType = this.service.computeLegLineType();
        const color = (_a = MapLegLineTypeColor[timedLegLineType]) !== null && _a !== void 0 ? _a : defaultColor;
        return color;
    }
    computeBeelineGeoPositions() {
        const geoPositions = [];
        const stopPoints = [];
        stopPoints.push(this.fromStopPoint);
        this.intermediateStopPoints.forEach(stopPoint => {
            stopPoints.push(stopPoint);
        });
        stopPoints.push(this.toStopPoint);
        stopPoints.forEach(stopPoint => {
            if (stopPoint.location.geoPosition) {
                geoPositions.push(stopPoint.location.geoPosition);
            }
        });
        return geoPositions;
    }
    useBeeline() {
        const usedDetailedLine = this.service.ptMode.hasPrecisePolyline();
        const useBeeline = super.useBeeline() || !usedDetailedLine;
        return useBeeline;
    }
    patchSituations(mapContextSituations) {
        this.service.siriSituations = [];
        this.service.siriSituationIds.forEach(siriSituationId => {
            var _a;
            const siriSituation = (_a = mapContextSituations[siriSituationId]) !== null && _a !== void 0 ? _a : null;
            if (siriSituation) {
                this.service.siriSituations.push(siriSituation);
            }
        });
    }
}