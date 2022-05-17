import React, { useState } from 'react'
import Reserver, {
  Tag,
  Bar, 
  useReserver,
  reserverReducer,
  createBar, 
  getPosition, 
  resizeBars,
} from 'react-reserver';
import Modali, { useModali } from 'modali';
import styles from './basicexamples.module.css';
import {
  SimpleContextMenu,
  ContextMenuItem
} from '../components/SimpleContextMenu'
import '../components/SimpleContextMenu/menuStyle.css'

const TITLE_WIDTH = 140;
const ROW_NUM = 2;

const cancelSCTEMessage = (deleteBar, setSelectedBar, selectedBar) => {
  deleteBar(selectedBar)
  setSelectedBar({})
}

const checkOverwrap = (bars, index = 0) => {
    if (index === bars.length) {
        return false;
    }
    for (const [i, bar] of bars.entries()) {
      if (i === index) {
          continue;
      }
      const curr = bars[index];
      if (curr.row !== bar.row ||
        curr.column > bar.column + bar.length ||
        curr.column + curr.length < bar.column) {
        continue;
      }
      return true;
    }
    return checkOverwrap(bars, index + 1);
}

export default function Bars({timelineLen, onTimelineUpdated, disabled}) {
  const [selectedBar, setSelectedBar] = useState({});
  const [contextMenuState, setContextMenuState] = useState({
    visibile: false,
    top: 0,
    left: 0
  });
  const {
    bars,
    // isEditing,
    // setIsEditing,
    addBar,
    setBars,
    editBar,
    deleteBar
  } = useReserver(reserverReducer, []);
  function setDrag(bar, event) {
    if (disabled) {
        return;
    }
    setSelectedBar(bar);
    setContextMenuState({
      visible: true,
      top: event.clientY,
      left: event.clientX
    });
  }
  const [addSCTEMessageModal, toggleAddSCTEMessage] = useModali({
    animated: true,
    title: `Adding SCTE35 ${selectedBar.row === 0 ? 'splice_insert()' : 'time_signal(Program Start/End)'} message`,
    message: 'Deleting this user will be permanent.',
    onEscapeKeyDown: () =>
      cancelSCTEMessage(deleteBar, setSelectedBar, selectedBar),
    onOverlayClicked: () =>
      cancelSCTEMessage(deleteBar, setSelectedBar, selectedBar),
    buttons: [
      <Modali.Button
        key='0'
        label='Cancel'
        isStyleCancel
        onClick={() => {
          toggleAddSCTEMessage();
          cancelSCTEMessage(deleteBar, setSelectedBar, selectedBar);
        }}
      />,
      <Modali.Button
        key='1'
        label='Add'
        isStyleDefault
        onClick={() => {
          editBar({
            ...selectedBar
          });
          toggleAddSCTEMessage();
          setSelectedBar({});
          onTimelineUpdated(bars.map(bar => {
            return ({
              type: bar.row === 0 ? 'avail' : 'program',
              offset: bar.column,
              length: bar.length,
            });
          }));
        }}
      />
    ]
  });
    return (
      <>
      <Reserver 
        width={TITLE_WIDTH + 20 * timelineLen}
        height={20 * ROW_NUM}
        cellClassName={styles.row_cell}
        columnTitleClassName={styles.row}
        columnTitles={(columnCount) => {
          return [...new Array(columnCount)].map(
            (_, index) => {
              return (
                <div
                  key={index}
                  style={{
                    background: '#12D3CF',
                    height: '100%',
                    width: '100%',
                    textAlign: 'center',
                    cursor: 'pointer'
                  }}
                >
                  {index}
                </div>
              )
            }
          )
        }}
        rowTitles={(rowCount) => {
          return [...new Array(rowCount)].map((_, index) => {
            return (
              <div
                key={index}
                style={{
                background: '#12D3CF',
                height: '100%',
                width: '100%',
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '15px'
                }}
              >
                {index === 0 ? 'Splice Insert' : 'Program Start/End'}
              </div>
            )
          })
        }}
        rowTitleWidth={TITLE_WIDTH}
        mouseDownCell={(props) => {
            if (disabled) {
                return;
            }
            const {dimension, cell} = props;
            const firstBarInRow = bars.find(bar => bar.row === cell.row && bar.editing) === undefined;
            if (firstBarInRow) {
                const newbar = createBar(dimension, cell, {prefix: 'Schedule-'});
                addBar(newbar);
            } else {
                const resizedBars = resizeBars(bars, props);
                const overwrapped = checkOverwrap(resizedBars);
                const dBars = (overwrapped ? bars : resizedBars).map((bar) => {
                    if (bar.editing) {
                        const updatedBar = { ...bar, editing: false, style: { ...bar.style, pointerEvents: 'auto' } };
                        if (overwrapped) {
                            setSelectedBar({}); 
                        } else {
                            setSelectedBar(updatedBar);                            
                        }
                        return updatedBar;
                    }
                    return bar;
                });
                setBars(dBars);
                if (overwrapped) {
                    return console.log('Timeline is overwrapped');
                }
                toggleAddSCTEMessage();
            }
        }}
    >
        {({ columnTitleHeight, rowTitleWidth, dimension }) => {
          return bars.map((bar) => {
            return (
              <Bar 
                onContextMenu={(event) => {
                  event.preventDefault()
                  setDrag(bar, event)
                }}
                key={bar.id}
                {...bar} 
                style={{
                  ...bar.style,
                  ...getPosition(bar.row, bar.column, bar.dimension, rowTitleWidth, columnTitleHeight)
                }}
              >
                <Tag
                  style={{
                    color: '#fff',
                    width: dimension.width * bar.length,
                    textAlign: 'center'
                  }}
                >
                  {bar.length} seconds {bar.row === 0 ? 'avail' : 'program'}
                </Tag>
              </Bar>
            )
          })
        }}
      </Reserver>
      <SimpleContextMenu className='cmenu' {...contextMenuState}>
        <ContextMenuItem
          onClick={() => {
            deleteBar(selectedBar)
            setContextMenuState({ visibile: false })
          }}
        >
          Delete {selectedBar.length} sec {selectedBar.row === 0 ? 'avail' : 'program'}
        </ContextMenuItem>
      </SimpleContextMenu>
      <Modali.Modal {...addSCTEMessageModal}>
        <div style={{ marginLeft: '20px', padding: '2px' }}>
          <div />
          <div>
            <p>
            Duration:
            <input
              readOnly={true}
              type='text'
              value={`${selectedBar.length} seconds`}
            />
            </p>
          </div>
        </div>
      </Modali.Modal>
    </>
    );
}
